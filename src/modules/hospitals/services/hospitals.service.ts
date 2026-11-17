import {
  decodeProviderImage,
  providerImageInput,
  omitProviderImage,
} from '../../../common/media/provider-image';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
  getTableColumns,
} from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import {
  hospitals,
  careDirectoryEntries as care,
  administrationAuditLogs,
} from '../../../database/schema';
import { getDatabaseErrorCode, isUniqueViolation } from '../../../common/errors/database-error';
import {
  hospitalAdminQuery,
  hospitalDelete,
  hospitalInput,
  hospitalPhone,
  hospitalQuery,
  hospitalReview,
  hospitalUpdate,
  type HospitalInput,
} from '../requests/hospitals.input';
import { hospitalHeaders, prepareHospitals } from '../imports/hospitals.import';

type Transaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
const lock = sql`select pg_advisory_xact_lock(6389023)`;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const { image_data: binaryImage, ...profileColumns } = getTableColumns(hospitals);
void binaryImage;
const fields = {
  ...profileColumns,
  image_url: sql<
    string | null
  >`case when ${hospitals.image_revision} is null then null else '/api/v1/public/hospitals/' || ${hospitals.id} || '/image?v=' || ${hospitals.image_revision} end`,
  published: care.published,
  reviewedAt: care.reviewedAt,
  reviewedBy: care.reviewedBy,
  reviewEvidence: care.reviewEvidence,
};
type Hospital = Omit<typeof hospitals.$inferSelect, 'image_data'> & { image_data?: Buffer | null };

@Injectable()
export class HospitalsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success)
      throw new BadRequestException(
        result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      );
    return result.data;
  }
  private visible() {
    return eq(hospitals.listed, true);
  }
  private present<T extends { reviewedBy: unknown; reviewEvidence: unknown }>(
    row: T,
    admin: boolean,
  ) {
    return admin ? row : { ...row, reviewedBy: undefined, reviewEvidence: undefined };
  }
  async list(query: unknown, admin = false) {
    const q = this.parse(admin ? hospitalAdminQuery : hospitalQuery, query),
      conditions: SQL[] = [];
    if (!admin) conditions.push(this.visible());
    else if ('status' in q && q.status !== 'all')
      conditions.push(eq(care.published, q.status === 'published'));
    if (q.city) conditions.push(sql`lower(btrim(${hospitals.city}))=${q.city.toLowerCase()}`);
    if (q.state) conditions.push(sql`lower(btrim(${hospitals.state}))=${q.state.toLowerCase()}`);
    if (q.type) conditions.push(sql`lower(${hospitals.hospital_type})=${q.type.toLowerCase()}`);
    const benefits = {
      ayushman: hospitals.accepts_ayushman,
      janaadhaar: hospitals.accepts_janaadhaar,
      cghs: hospitals.accepts_cghs,
      esic: hospitals.accepts_esic,
      rgahs: hospitals.rgahs_approved,
      cashless: hospitals.is_cashless,
      nabh: hospitals.nabh_accredited,
    };
    if (q.benefit) conditions.push(eq(benefits[q.benefit], true));
    if (q.search) {
      const term = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(hospitals.name_en, term),
          ilike(hospitals.name_hi, term),
          ilike(hospitals.address_line1, term),
          ilike(hospitals.city, term),
          ilike(hospitals.landmark, term),
        )!,
      );
    }
    const where = and(...conditions),
      [items, total] = await Promise.all([
        this.database.db
          .select(fields)
          .from(hospitals)
          .innerJoin(care, eq(care.id, hospitals.id))
          .where(where)
          .orderBy(
            asc(
              q.language === 'hi'
                ? sql`coalesce(nullif(${hospitals.name_hi},''),${hospitals.name_en})`
                : sql`lower(${hospitals.name_en})`,
            ),
            asc(hospitals.id),
          )
          .limit(q.limit)
          .offset((q.page - 1) * q.limit),
        this.database.db
          .select({ count: count() })
          .from(hospitals)
          .innerJoin(care, eq(care.id, hospitals.id))
          .where(where),
      ]);
    return {
      items: items.map((row) => this.present(row, admin)),
      total: total[0]!.count,
      page: q.page,
      hasNext: q.page * q.limit < total[0]!.count,
    };
  }
  async detail(id: string, admin = false) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select(fields)
      .from(hospitals)
      .innerJoin(care, eq(care.id, hospitals.id))
      .where(and(eq(hospitals.id, id), admin ? undefined : this.visible()))
      .limit(1);
    if (!row) throw new NotFoundException('Hospital not found or hidden from the directory.');
    return this.present(row, admin);
  }
  private async write<T>(operation: (tx: Transaction) => Promise<T>) {
    try {
      return await this.database.db.transaction(async (tx) => {
        await tx.execute(lock);
        return operation(tx);
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('This source key already exists. Use its existing record.');
      if (getDatabaseErrorCode(error) === '23503')
        throw new ConflictException(
          'Hospital has linked records. Withdraw it instead of deleting.',
        );
      throw error;
    }
  }
  private async audit(
    tx: Transaction,
    actorId: string,
    action: string,
    targetId: string | null,
    metadata: Record<string, unknown> = {},
  ) {
    await tx
      .insert(administrationAuditLogs)
      .values({ actorId, action: `hospitals.${action}`, targetId, outcome: 'succeeded', metadata });
  }
  private projection(value: HospitalInput) {
    return {
      sourceKey: value.source_key,
      kind: 'hospital',
      name: value.name_en,
      nameHi: value.name_hi,
      city: value.city,
      address: [
        value.address_line1,
        value.address_line2,
        value.landmark,
        value.city,
        value.state,
        value.pincode,
      ]
        .filter(Boolean)
        .join(', '),
      addressHi: value.address_hi,
      phone: hospitalPhone(value.country_code_1, value.phone_1),
      sourceUrl: value.source_url ?? '',
      details: {
        specialties: value.specialties,
        qualifications: '',
        registration: '',
        languages: [],
        providerType: value.hospital_type,
        summary: value.summary_en,
        precautions: '',
        latitude: value.latitude,
        longitude: value.longitude,
      },
      published: false,
      reviewedAt: null,
      reviewedBy: null,
      reviewEvidence: null,
      updatedAt: new Date(),
    };
  }
  private data(row: Hospital) {
    return Object.fromEntries(hospitalHeaders.map((key) => [key, row[key]]));
  }
  private async insert(tx: Transaction, value: HospitalInput) {
    const id = randomUUID();
    await tx.insert(care).values({ id, ...this.projection(value) });
    const [row] = await tx
      .insert(hospitals)
      .values({ id, ...value })
      .returning();
    return row!;
  }
  private async change(tx: Transaction, row: Hospital, value: HospitalInput) {
    const [saved] = await tx
      .update(hospitals)
      .set({ ...value, version: row.version + 1, updated_at: new Date() })
      .where(and(eq(hospitals.id, row.id), eq(hospitals.version, row.version)))
      .returning();
    if (!saved) throw new ConflictException('Hospital changed. Reload first.');
    await tx.update(care).set(this.projection(value)).where(eq(care.id, row.id));
    return saved;
  }
  create(actor: string, body: unknown) {
    const value = this.parse(hospitalInput, body);
    return this.write(async (tx) => {
      const row = await this.insert(tx, value);
      await this.audit(tx, actor, 'create', row.id);
      return { ...omitProviderImage(row), published: false };
    });
  }
  update(actor: string, id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const { expectedVersion, ...changes } = this.parse(hospitalUpdate, body);
    return this.write(async (tx) => {
      const [row] = await tx.select().from(hospitals).where(eq(hospitals.id, id));
      if (!row || row.version !== expectedVersion)
        throw new ConflictException('Hospital changed or was removed. Reload first.');
      const value = this.parse(hospitalInput, { ...this.data(row), ...changes });
      const saved = await this.change(tx, row, value);
      await this.audit(tx, actor, 'update', id);
      return { ...omitProviderImage(saved), published: false, reviewRequired: true };
    });
  }
  review(actor: string, id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const value = this.parse(hospitalReview, body);
    return this.write(async (tx) => {
      const [row] = await tx.select().from(hospitals).where(eq(hospitals.id, id));
      if (!row || row.version !== value.expectedVersion)
        throw new ConflictException('Hospital changed. Reload before reviewing.');
      if (value.publish && (!row.source_url || !row.address_line1 || !row.phone_1))
        throw new BadRequestException(
          'A sourced address, primary contact and HTTPS evidence URL are required before publication.',
        );
      await tx
        .update(care)
        .set({
          published: value.publish,
          reviewedAt: new Date(),
          reviewedBy: actor,
          reviewEvidence: `${value.reviewerName} (${value.reviewerQualification}): ${value.evidence}`,
          updatedAt: new Date(),
        })
        .where(eq(care.id, id));
      const [saved] = await tx
        .update(hospitals)
        .set({ version: row.version + 1, updated_at: new Date(), ...(value.publish ? { listed: true } : { listed: false }) })
        .where(eq(hospitals.id, id))
        .returning();
      await this.audit(tx, actor, value.publish ? 'publish' : 'withdraw', id);
      return { ...omitProviderImage(saved!), published: value.publish };
    });
  }
  visibility(actor: string, id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const value = this.parse(z.object({ listed: z.boolean(), expectedVersion: z.number().int().positive() }).strict(), body);
    return this.write(async tx => {
      const [row] = await tx.select().from(hospitals).where(eq(hospitals.id, id));
      if (!row || row.version !== value.expectedVersion) throw new ConflictException('Hospital changed. Reload first.');
      const [saved] = await tx.update(hospitals).set({ listed: value.listed, version: row.version + 1, updated_at: new Date() }).where(eq(hospitals.id, id)).returning();
      await this.audit(tx, actor, value.listed ? 'list' : 'hide', id);
      return omitProviderImage(saved!);
    });
  }
  remove(actor: string, id: string, query: unknown) {
    this.parse(z.uuid(), id);
    const { expected_version } = this.parse(hospitalDelete, query);
    return this.write(async (tx) => {
      const [row] = await tx.select().from(hospitals).where(eq(hospitals.id, id));
      if (!row || row.version !== expected_version)
        throw new ConflictException('Hospital changed or was removed. Reload first.');
      await tx.delete(care).where(eq(care.id, id));
      await this.audit(tx, actor, 'delete', id);
      return { deleted: true };
    });
  }
  private async prepared(file?: Express.Multer.File) {
    try {
      return await prepareHospitals(file);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid hospital file.',
      );
    }
  }
  private async current(tx: Transaction | DatabaseService['db']) {
    return tx
      .select(fields)
      .from(hospitals)
      .innerJoin(care, eq(care.id, hospitals.id))
      .orderBy(asc(hospitals.id));
  }
  private async plan(
    prepared: Awaited<ReturnType<typeof prepareHospitals>>,
    existing: Awaited<ReturnType<HospitalsService['current']>>,
    tx: Transaction | DatabaseService['db'],
  ) {
    const keys = new Map(existing.map((row) => [row.source_key, row])),
      errors = [...prepared.errors];
    const sourceKeys = prepared.rows.map((row) => row.value.source_key),
      collisions = sourceKeys.length
        ? await tx
            .select({ key: care.sourceKey })
            .from(care)
            .where(inArray(care.sourceKey, sourceKeys))
        : [];
    const unavailable = new Set(
      collisions.filter((row) => !keys.has(row.key)).map((row) => row.key),
    );
    for (const row of prepared.rows)
      if (unavailable.has(row.value.source_key))
        errors.push({
          row: row.row,
          message:
            'Source key belongs to a legacy or other care record. Resolve its identity before import.',
        });
    const updates = prepared.rows.filter((row) => keys.has(row.value.source_key)).length;
    return {
      totalRows: prepared.totalRows,
      creates: prepared.rows.length - updates,
      updates,
      returnsToDraft: prepared.rows.filter((row) => keys.get(row.value.source_key)?.published)
        .length,
      errorCount: errors.length,
      errors,
      ignoredVerificationFlags: prepared.ignoredVerificationFlags,
      sample: prepared.rows.slice(0, 10).map((row) => ({
        source_key: row.value.source_key,
        name_en: row.value.name_en,
        city: row.value.city,
        state: row.value.state,
      })),
    };
  }
  private sign(value: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_ACCESS_SECRET'))
      .update('hospitals-import-v1:' + value)
      .digest('base64url');
  }
  async preview(actor: string, file?: Express.Multer.File) {
    const prepared = await this.prepared(file),
      existing = await this.current(this.database.db),
      plan = await this.plan(prepared, existing, this.database.db),
      expiresAt = Date.now() + 600000,
      payload = Buffer.from(
        JSON.stringify({
          actor,
          hash: hash(file!.buffer),
          state: hash(JSON.stringify(existing)),
          expiresAt,
        }),
      ).toString('base64url');
    return {
      ...plan,
      expiresAt: new Date(expiresAt).toISOString(),
      previewToken: plan.errorCount ? null : payload + '.' + this.sign(payload),
    };
  }
  async apply(actor: string, file: Express.Multer.File | undefined, token: unknown) {
    const prepared = await this.prepared(file),
      [payload, signature, ...rest] = this.parse(z.string().min(1).max(4096), token).split('.');
    const expected = Buffer.from(this.sign(payload ?? '')),
      provided = Buffer.from(signature ?? '');
    if (rest.length || expected.length !== provided.length || !timingSafeEqual(expected, provided))
      throw new BadRequestException('Invalid import preview. Preview again.');
    let authorization: { actor: string; hash: string; state: string; expiresAt: number };
    try {
      authorization = z
        .object({ actor: z.string(), hash: z.string(), state: z.string(), expiresAt: z.number() })
        .parse(JSON.parse(Buffer.from(payload!, 'base64url').toString()));
    } catch {
      throw new BadRequestException('Invalid import preview.');
    }
    if (
      authorization.actor !== actor ||
      authorization.hash !== hash(file!.buffer) ||
      authorization.expiresAt <= Date.now()
    )
      throw new ConflictException('File, administrator or preview expiry changed. Preview again.');
    return this.write(async (tx) => {
      const existing = await this.current(tx);
      if (hash(JSON.stringify(existing)) !== authorization.state)
        throw new ConflictException('Hospitals changed after preview. Preview again.');
      const plan = await this.plan(prepared, existing, tx);
      if (plan.errorCount)
        throw new BadRequestException({
          message: 'Fix all import errors before applying.',
          errors: plan.errors,
        });
      const keys = new Map(existing.map((row) => [row.source_key, row]));
      for (const { value } of prepared.rows) {
        const row = keys.get(value.source_key);
        if (row) await this.change(tx, row, value);
        else await this.insert(tx, value);
      }
      await this.audit(tx, actor, 'import', null, {
        rows: plan.totalRows,
        creates: plan.creates,
        updates: plan.updates,
      });
      return {
        imported: plan.totalRows,
        creates: plan.creates,
        updates: plan.updates,
        reviewRequired: true,
      };
    });
  }
  async image(id: string, admin = false) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select({ image_data: hospitals.image_data, image_revision: hospitals.image_revision })
      .from(hospitals)
      .innerJoin(care, eq(care.id, hospitals.id))
      .where(and(eq(hospitals.id, id), admin ? undefined : this.visible()))
      .limit(1);
    if (!row?.image_data) throw new NotFoundException('Image not found.');
    return row;
  }
  async uploadImage(
    actor: string,
    id: string,
    file: Express.Multer.File | undefined,
    body: unknown,
  ) {
    this.parse(z.uuid(), id);
    const input = this.parse(providerImageInput, body),
      image = await decodeProviderImage(file);
    return this.write(async (tx) => {
      const [existing] = await tx
        .select({ version: hospitals.version })
        .from(hospitals)
        .where(eq(hospitals.id, id));
      if (!existing || existing.version !== input.expectedVersion)
        throw new ConflictException('Record changed. Reload before uploading.');
      const revision = randomUUID();
      await tx
        .update(hospitals)
        .set({
          image_data: image,
          image_alt: input.alt,
          image_revision: revision,
          version: existing.version + 1,
          updated_at: new Date(),
        })
        .where(eq(hospitals.id, id));
      await tx
        .update(care)
        .set({
          imageUrl: `/api/v1/public/hospitals/${id}/image?v=${revision}`,
          imageAlt: input.alt,
          published: false,
          reviewedAt: null,
          reviewedBy: null,
          reviewEvidence: null,
          updatedAt: new Date(),
        })
        .where(eq(care.id, id));
      await this.audit(tx, actor, 'image.upload', id, { bytes: image.length });
      return {
        version: existing.version + 1,
        image_url: `/api/v1/public/hospitals/${id}/image?v=${revision}`,
        image_alt: input.alt,
        published: false,
        reviewRequired: true,
      };
    });
  }
  removeImage(actor: string, id: string, query: unknown) {
    this.parse(z.uuid(), id);
    const { expected_version } = this.parse(hospitalDelete, query);
    return this.write(async (tx) => {
      const [existing] = await tx
        .select({ version: hospitals.version })
        .from(hospitals)
        .where(eq(hospitals.id, id));
      if (!existing || existing.version !== expected_version)
        throw new ConflictException('Record changed. Reload before removing the image.');
      await tx
        .update(hospitals)
        .set({
          image_data: null,
          image_alt: '',
          image_revision: null,
          version: existing.version + 1,
          updated_at: new Date(),
        })
        .where(eq(hospitals.id, id));
      await tx
        .update(care)
        .set({
          imageUrl: null,
          imageAlt: '',
          published: false,
          reviewedAt: null,
          reviewedBy: null,
          reviewEvidence: null,
          updatedAt: new Date(),
        })
        .where(eq(care.id, id));
      await this.audit(tx, actor, 'image.remove', id);
      return {
        version: existing.version + 1,
        removed: true,
        published: false,
        reviewRequired: true,
      };
    });
  }
}
