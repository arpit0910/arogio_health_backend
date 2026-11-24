import { randomUUID } from 'node:crypto';
import { auditReviewSummary } from '../../../common/directory/review-input';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import {
  careDirectoryEntries as entries,
  careProviderAffiliations as links,
  careDirectoryCorrections as corrections,
  administrationAuditLogs,
  bloodBankCorrections,
  bloodBankDirectoryEntries,
  hospitals,
  doctors,
  doctorDepartments,
  medicalDepartments,
} from '../../../database/schema';
import {
  careInput,
  careQuery,
  correctionInput,
  reviewInput,
} from '../requests/care-directory.input';

@Injectable()
export class CareDirectoryService {
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
      or(eq(entries.kind, 'hospital'), eq(entries.kind, 'doctor'), eq(entries.city, 'Jaipur'))!,
      sql`(not exists(select 1 from ${doctors} d where d.id=${entries.id}) or exists(select 1 from ${doctorDepartments} dd inner join ${medicalDepartments} dep on dep.id=dd.department_id where dd.doctor_id=${entries.id} and dep.is_active=true))`,
    ];
  }
  private present(row: typeof entries.$inferSelect, admin: boolean) {
    if (admin) return row;
    const publicRow = { ...row, recordKey: undefined, reviewedBy: undefined, reviewEvidence: undefined };
    return { ...publicRow, verification: 'source-reviewed', freshnessDays: 180 };
  }
  async list(query: unknown, admin = false) {
    const q = this.parse(careQuery, query);
    const cityWasProvided = typeof query === 'object' && query !== null && 'city' in query;
    if (['hospital', 'doctor'].includes(q.kind ?? '') && !cityWasProvided) q.city = '';
    if (!['hospital', 'doctor'].includes(q.kind ?? '') && q.city.toLowerCase() !== 'jaipur')
      return { items: [], hasNext: false, page: q.page, coverage: 'unsupported-city' };
    const filters: SQL[] = admin ? [] : this.publicFilter();
    if (q.kind) filters.push(eq(entries.kind, q.kind));
    if ((['hospital', 'doctor'].includes(q.kind ?? '') || (!q.kind && cityWasProvided)) && q.city)
      filters.push(sql`lower(btrim(${entries.city})) = ${q.city.toLowerCase()}`);
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
      coverage:
        !q.kind && !cityWasProvided ? 'available-locations' : q.city || 'available-locations',
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
      throw new NotFoundException('This care entry is unavailable or awaiting listing review.');
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
    if (id) this.parse(z.uuid(), id);
    const { expectedUpdatedAt, ...data } = this.parse(careInput, body);
    return this.database.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(6389022)`);
      await tx.execute(sql`select pg_advisory_xact_lock(6389023)`);
      await tx.execute(sql`select pg_advisory_xact_lock(6389025)`);
      if (
        id &&
        (await tx.select({ id: doctors.id }).from(doctors).where(eq(doctors.id, id))).length
      )
        throw new ConflictException(
          'Use the Doctors administration tab to edit this structured doctor.',
        );
      if (data.kind === 'hospital') await tx.execute(sql`select pg_advisory_xact_lock(6389023)`);
      if (id && data.kind === 'hospital') {
        const [profile] = await tx
          .select({ id: hospitals.id })
          .from(hospitals)
          .where(eq(hospitals.id, id));
        if (profile)
          throw new ConflictException(
            'Use the Hospitals administration tab to edit this structured hospital.',
          );
      }
      let result: typeof entries.$inferSelect | undefined;
      if (id) {
        this.parse(z.uuid(), id);
        if (!expectedUpdatedAt) throw new BadRequestException('Reload the entry before editing.');
        // Stable identity is immutable. Every edit unpublishes and requires a new review.
        const current = await tx.select().from(entries).where(eq(entries.id, id)).limit(1);
        if (!current[0]) throw new NotFoundException();
        if ((data.recordKey && current[0].recordKey !== data.recordKey) || current[0].kind !== data.kind)
          throw new BadRequestException('Record key and kind are immutable.');
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
          .values({ ...data, recordKey: data.recordKey ?? randomUUID(), updatedAt: new Date() })
          .onConflictDoNothing({ target: entries.recordKey })
          .returning();
        if (!result)
          throw new ConflictException(
            'This record identifier already exists. Edit the existing entry.',
          );
      }
      await tx.insert(administrationAuditLogs).values({
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
      await tx.execute(sql`select pg_advisory_xact_lock(6389022)`);
      await tx.execute(sql`select pg_advisory_xact_lock(6389023)`);
      await tx.execute(sql`select pg_advisory_xact_lock(6389025)`);
      if ((await tx.select({ id: doctors.id }).from(doctors).where(eq(doctors.id, id))).length)
        throw new ConflictException('Use the Doctors administration tab for source review.');
      const [row] = await tx.select().from(entries).where(eq(entries.id, id)).for('update');
      if (!row) throw new NotFoundException();
      const [profile] =
        row.kind === 'hospital'
          ? await tx.select().from(hospitals).where(eq(hospitals.id, id))
          : [];
      if (row.updatedAt.toISOString() !== review.expectedUpdatedAt)
        throw new ConflictException('Entry changed. Reload before reviewing.');
      if (review.publish && row.kind !== 'medicine' && (!row.address || !row.phone))
        throw new BadRequestException(
          'An address and contact number are required before publication.',
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
      if (row.kind === 'medicine' && review.publish
        && ((review.evidence?.length ?? 0) < 20 || (review.reviewerName?.length ?? 0) < 3
          || (review.reviewerQualification?.length ?? 0) < 3)) {
        throw new BadRequestException('Medicine publication requires a named reviewer and clinical review notes.');
      }
      const evidence = auditReviewSummary(review);
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
      if (profile)
        await tx
          .update(hospitals)
          .set({ version: profile.version + 1, updated_at: new Date() })
          .where(eq(hospitals.id, id));
      await tx.insert(administrationAuditLogs).values({
        actorId: actor,
        action: review.publish ? 'care.review.publish' : 'care.withdraw',
        targetId: id,
        outcome: 'succeeded',
        metadata: { evidence },
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
      await tx.execute(sql`select pg_advisory_xact_lock(6389025)`);
      if ((await tx.select({ id: doctors.id }).from(doctors).where(eq(doctors.id, id))).length)
        throw new ConflictException(
          'Use the Doctors administration tab to manage recorded affiliations.',
        );
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
      await tx.insert(administrationAuditLogs).values({
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
      .from(bloodBankCorrections)
      .where(eq(bloodBankCorrections.state, 'open'))
      .orderBy(asc(bloodBankCorrections.createdAt))
      .limit(100);
    return [...care, ...banks.map((row) => ({ ...row, entryId: row.bankId, kind: 'blood-bank' }))];
  }
  async reportBank(id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const [bank] = await this.database.db
      .select({ id: bloodBankDirectoryEntries.id })
      .from(bloodBankDirectoryEntries)
      .where(
        and(
          eq(bloodBankDirectoryEntries.id, id),
          eq(bloodBankDirectoryEntries.is_active, true),
          eq(bloodBankDirectoryEntries.is_verified, true),
          eq(bloodBankDirectoryEntries.city, 'Jaipur'),
          gte(bloodBankDirectoryEntries.verified_at, new Date(Date.now() - 180 * 86400000)),
        ),
      );
    if (!bank) throw new NotFoundException();
    const data = this.parse(correctionInput, body);
    await this.database.db
      .insert(bloodBankCorrections)
      .values({ bankId: id, message: data.message });
    return { received: true };
  }
  async reviewBank(id: string, actor: string, body: unknown, requireActive = false) {
    this.parse(z.uuid(), id);
    const review = this.parse(reviewInput, body);
    return this.database.db.transaction(async (tx) => {
      const [bank] = await tx
        .select()
        .from(bloodBankDirectoryEntries)
        .where(eq(bloodBankDirectoryEntries.id, id))
        .for('update');
      if (!bank) throw new NotFoundException();
      if (requireActive && !bank.is_active) throw new ConflictException('Inactive blood bank. Activate this record before approving.');
      if (bank.updated_at.toISOString() !== review.expectedUpdatedAt)
        throw new ConflictException('Bank changed. Reload before reviewing.');
      if (
        review.publish &&
        (!bank.address_en.trim() ||
          !/^\+?\d{6,15}$/.test((bank.phone ?? '').replace(/[ ()-]/g, '')))
      )
        throw new BadRequestException(
          'An address and usable phone number are required.',
        );
      const [saved] = await tx
        .update(bloodBankDirectoryEntries)
        .set({
          is_verified: review.publish,
          verified_at: review.publish ? new Date() : null,
          updated_at: new Date(),
        })
        .where(eq(bloodBankDirectoryEntries.id, id))
        .returning();
      await tx.insert(administrationAuditLogs).values({
        actorId: actor,
        action: review.publish ? 'blood-bank.review.publish' : 'blood-bank.withdraw',
        targetId: id,
        outcome: 'succeeded',
        metadata: {
          evidence: auditReviewSummary(review),
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
          .update(bloodBankCorrections)
          .set({ ...data, resolvedBy: actor, state: 'resolved' })
          .where(and(eq(bloodBankCorrections.id, id), eq(bloodBankCorrections.state, 'open')))
          .returning();
        if (!bankRows.length) throw new NotFoundException();
      }
      await tx.insert(administrationAuditLogs).values({
        actorId: actor,
        action: 'care.correction.resolve',
        targetId: id,
        outcome: 'succeeded',
      });
      return { resolved: true };
    });
  }
}
