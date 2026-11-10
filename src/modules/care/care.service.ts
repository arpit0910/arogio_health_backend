import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import {
  careEntries as entries,
  careAffiliations as links,
  careCorrections as corrections,
  adminAudit,
  bankCorrections,
  bloodBanks,
} from '../../database/schema';
import { careInput, careQuery, correctionInput, reviewInput } from './care.input';

@Injectable()
export class CareService {
  constructor(private readonly database: DatabaseService) {}
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(' '));
    return parsed.data;
  }
  private publicFilter(): SQL[] {
    return [
      eq(entries.published, true),
      gte(entries.reviewedAt, new Date(Date.now() - 180 * 86400000)),
      eq(entries.city, 'Jaipur'),
    ];
  }
  private present(row: typeof entries.$inferSelect, admin: boolean) {
    if (admin) return row;
    const publicRow = { ...row, reviewedBy: undefined, reviewEvidence: undefined };
    return { ...publicRow, verification: 'source-reviewed', freshnessDays: 180 };
  }
  async list(query: unknown, admin = false) {
    const q = this.parse(careQuery, query);
    if (q.city.toLowerCase() !== 'jaipur')
      return { items: [], hasNext: false, page: q.page, coverage: 'unsupported-city' };
    const filters: SQL[] = admin ? [] : this.publicFilter();
    if (q.kind) filters.push(eq(entries.kind, q.kind));
    if (q.specialty)
      filters.push(
        sql`${entries.details}->'specialties' @> ${JSON.stringify([q.specialty])}::jsonb`,
      );
    if (q.search) {
      const term = `%${q.search.normalize('NFC').replace(/[%_\\]/g, '\\$&')}%`;
      filters.push(
        or(
          ilike(entries.name, term),
          ilike(entries.nameHi, term),
          ilike(entries.address, term),
          sql`${entries.details}->>'specialties' ilike ${term}`,
        )!,
      );
    }
    const rows = await this.database.db
      .select()
      .from(entries)
      .where(and(...filters))
      .orderBy(asc(entries.name), asc(entries.id))
      .limit(q.limit + 1)
      .offset((q.page - 1) * q.limit);
    return {
      items: rows.slice(0, q.limit).map((row) => this.present(row, admin)),
      hasNext: rows.length > q.limit,
      page: q.page,
      coverage: 'Jaipur',
    };
  }
  async detail(id: string, admin = false) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), ...(admin ? [] : this.publicFilter())))
      .limit(1);
    if (!row)
      throw new NotFoundException('This care entry is unavailable or awaiting source review.');
    const relations = await this.database.db
      .select()
      .from(links)
      .where(or(eq(links.doctorId, id), eq(links.hospitalId, id)));
    const ids = relations.map((link) => (link.doctorId === id ? link.hospitalId : link.doctorId));
    const affiliated = ids.length
      ? await this.database.db
          .select()
          .from(entries)
          .where(and(inArray(entries.id, ids), ...(admin ? [] : this.publicFilter())))
      : [];
    return {
      ...this.present(row, admin),
      affiliations: affiliated.map((entry) => this.present(entry, admin)),
    };
  }
  async save(id: string | null, actor: string, body: unknown) {
    const { expectedUpdatedAt, ...data } = this.parse(careInput, body);
    return this.database.db.transaction(async (tx) => {
      let result: typeof entries.$inferSelect | undefined;
      if (id) {
        this.parse(z.uuid(), id);
        if (!expectedUpdatedAt) throw new BadRequestException('Reload the entry before editing.');
        // Stable identity is immutable. Every edit unpublishes and requires a new review.
        const current = await tx.select().from(entries).where(eq(entries.id, id)).limit(1);
        if (!current[0]) throw new NotFoundException();
        if (current[0].sourceKey !== data.sourceKey || current[0].kind !== data.kind)
          throw new BadRequestException('Source key and kind are immutable.');
        [result] = await tx
          .update(entries)
          .set({
            ...data,
            published: false,
            reviewedAt: null,
            reviewedBy: null,
            reviewEvidence: null,
            updatedAt: new Date(),
          })
          .where(and(eq(entries.id, id), eq(entries.updatedAt, new Date(expectedUpdatedAt))))
          .returning();
        if (!result) throw new ConflictException('Entry changed. Reload before editing.');
      } else {
        [result] = await tx
          .insert(entries)
          .values({ ...data, updatedAt: new Date() })
          .onConflictDoNothing({ target: entries.sourceKey })
          .returning();
        if (!result)
          throw new ConflictException(
            'This source identifier already exists. Edit the existing entry.',
          );
      }
      await tx.insert(adminAudit).values({
        actorId: actor,
        action: 'care.save',
        targetId: result.id,
        outcome: 'succeeded',
      });
      return result;
    });
  }
  async review(id: string, actor: string, body: unknown) {
    this.parse(z.uuid(), id);
    const review = this.parse(reviewInput, body);
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx.select().from(entries).where(eq(entries.id, id)).for('update');
      if (!row) throw new NotFoundException();
      if (row.updatedAt.toISOString() !== review.expectedUpdatedAt)
        throw new ConflictException('Entry changed. Reload before reviewing.');
      if (review.publish && row.kind !== 'medicine' && (!row.address || !row.phone))
        throw new BadRequestException(
          'A sourced address and contact number are required before publication.',
        );
      if (
        review.publish &&
        row.kind === 'doctor' &&
        (!row.details.registration || !row.details.qualifications)
      )
        throw new BadRequestException(
          'Verify qualifications and medical registration before publishing.',
        );
      if (
        review.publish &&
        row.kind === 'medicine' &&
        (!row.details.summary || !row.details.precautions)
      )
        throw new BadRequestException(
          'Clinically reviewed education and precautions are required.',
        );
      const evidence = `${review.reviewerName} (${review.reviewerQualification}): ${review.evidence}`;
      const [saved] = await tx
        .update(entries)
        .set({
          published: review.publish,
          reviewedAt: new Date(),
          reviewedBy: actor,
          reviewEvidence: evidence,
          updatedAt: new Date(),
        })
        .where(eq(entries.id, id))
        .returning();
      await tx.insert(adminAudit).values({
        actorId: actor,
        action: review.publish ? 'care.review.publish' : 'care.withdraw',
        targetId: id,
        outcome: 'succeeded',
        metadata: { evidence, sourceUrl: row.sourceUrl },
      });
      return saved;
    });
  }
  async affiliations(id: string, actor: string, body: unknown) {
    this.parse(z.uuid(), id);
    const data = this.parse(
      z
        .object({ hospitalIds: z.array(z.uuid()).max(30), expectedUpdatedAt: z.iso.datetime() })
        .strict(),
      body,
    );
    return this.database.db.transaction(async (tx) => {
      const [doctor] = await tx.select().from(entries).where(eq(entries.id, id)).for('update');
      if (doctor?.kind !== 'doctor') throw new BadRequestException('Choose a doctor entry.');
      if (doctor.updatedAt.toISOString() !== data.expectedUpdatedAt)
        throw new ConflictException('Doctor changed. Reload first.');
      const ids = [...new Set(data.hospitalIds)];
      const hospitals = ids.length
        ? await tx
            .select()
            .from(entries)
            .where(and(inArray(entries.id, ids), eq(entries.kind, 'hospital')))
        : [];
      if (hospitals.length !== ids.length)
        throw new BadRequestException('Every affiliation must reference an existing hospital.');
      await tx.delete(links).where(eq(links.doctorId, id));
      if (ids.length)
        await tx.insert(links).values(ids.map((hospitalId) => ({ doctorId: id, hospitalId })));
      await tx
        .update(entries)
        .set({ published: false, reviewedAt: null, reviewedBy: null, updatedAt: new Date() })
        .where(eq(entries.id, id));
      await tx.insert(adminAudit).values({
        actorId: actor,
        action: 'care.affiliations',
        targetId: id,
        outcome: 'succeeded',
      });
      return { saved: true, reviewRequired: true };
    });
  }
  async report(id: string, body: unknown) {
    await this.detail(id);
    const data = this.parse(correctionInput, body);
    await this.database.db.insert(corrections).values({ entryId: id, message: data.message });
    return { received: true };
  }
  async correctionQueue() {
    const care = await this.database.db
      .select()
      .from(corrections)
      .where(eq(corrections.state, 'open'))
      .orderBy(asc(corrections.createdAt))
      .limit(100);
    const banks = await this.database.db
      .select()
      .from(bankCorrections)
      .where(eq(bankCorrections.state, 'open'))
      .orderBy(asc(bankCorrections.createdAt))
      .limit(100);
    return [...care, ...banks.map((row) => ({ ...row, entryId: row.bankId, kind: 'blood-bank' }))];
  }
  async reportBank(id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const [bank] = await this.database.db
      .select({ id: bloodBanks.id })
      .from(bloodBanks)
      .where(
        and(
          eq(bloodBanks.id, id),
          eq(bloodBanks.is_active, true),
          eq(bloodBanks.is_verified, true),
          eq(bloodBanks.city, 'Jaipur'),
          gte(bloodBanks.verified_at, new Date(Date.now() - 180 * 86400000)),
        ),
      );
    if (!bank) throw new NotFoundException();
    const data = this.parse(correctionInput, body);
    await this.database.db.insert(bankCorrections).values({ bankId: id, message: data.message });
    return { received: true };
  }
  async reviewBank(id: string, actor: string, body: unknown) {
    this.parse(z.uuid(), id);
    const review = this.parse(
      reviewInput.extend({
        sourceUrl: z
          .url()
          .max(2000)
          .refine((value) => {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password;
          }),
      }),
      body,
    );
    return this.database.db.transaction(async (tx) => {
      const [bank] = await tx.select().from(bloodBanks).where(eq(bloodBanks.id, id)).for('update');
      if (!bank) throw new NotFoundException();
      if (bank.updated_at.toISOString() !== review.expectedUpdatedAt)
        throw new ConflictException('Bank changed. Reload before reviewing.');
      if (
        review.publish &&
        (bank.city !== 'Jaipur' ||
          !bank.address_en ||
          !/^\+?\d{6,15}$/.test((bank.phone ?? '').replace(/[ ()-]/g, '')))
      )
        throw new BadRequestException(
          'A sourced Jaipur address and usable phone number are required.',
        );
      const [saved] = await tx
        .update(bloodBanks)
        .set({
          is_verified: review.publish,
          source_url: review.publish ? review.sourceUrl : null,
          verified_at: review.publish ? new Date() : null,
          updated_at: new Date(),
        })
        .where(eq(bloodBanks.id, id))
        .returning();
      await tx
        .insert(adminAudit)
        .values({
          actorId: actor,
          action: review.publish ? 'blood-bank.review.publish' : 'blood-bank.withdraw',
          targetId: id,
          outcome: 'succeeded',
          metadata: {
            sourceUrl: review.sourceUrl,
            reviewer: review.reviewerName,
            qualification: review.reviewerQualification,
            evidence: review.evidence,
          },
        });
      return saved;
    });
  }
  async resolve(id: string, actor: string, body: unknown) {
    this.parse(z.uuid(), id);
    const data = this.parse(
      z.object({ resolution: z.string().trim().min(10).max(2000) }).strict(),
      body,
    );
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .update(corrections)
        .set({ ...data, resolvedBy: actor, state: 'resolved' })
        .where(and(eq(corrections.id, id), eq(corrections.state, 'open')))
        .returning();
      if (!row) {
        const bankRows = await tx
          .update(bankCorrections)
          .set({ ...data, resolvedBy: actor, state: 'resolved' })
          .where(and(eq(bankCorrections.id, id), eq(bankCorrections.state, 'open')))
          .returning();
        if (!bankRows.length) throw new NotFoundException();
      }
      await tx.insert(adminAudit).values({
        actorId: actor,
        action: 'care.correction.resolve',
        targetId: id,
        outcome: 'succeeded',
      });
      return { resolved: true };
    });
  }
}
