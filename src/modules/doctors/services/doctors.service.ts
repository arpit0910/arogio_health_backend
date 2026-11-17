import { directoryCountFields, directoryPredicates, directoryStatusInput, directoryRowStatus, activeDoctorDepartment } from '../../../common/directory/admin-status';
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
  gte,
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
  doctors,
  medicalDepartments as departments,
  hospitals,
  doctorDepartments,
  doctorHospitalAffiliations as affiliations,
  careProviderAffiliations as legacyLinks,
  careDirectoryEntries as care,
  administrationAuditLogs,
} from '../../../database/schema';
import { getDatabaseErrorCode, isUniqueViolation } from '../../../common/errors/database-error';
import {
  doctorAdminQuery,
  doctorDelete,
  doctorInput,
  doctorQuery,
  doctorReview,
  doctorUpdate,
  type DoctorInput,
} from '../requests/doctors.input';
import { hospitalPhone } from '../../hospitals/requests/hospitals.input';
import { prepareDoctors } from '../imports/doctors.import';

type Transaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
const lock = sql`select pg_advisory_xact_lock(6389025)`;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const { image_data: binaryImage, ...profileColumns } = getTableColumns(doctors);
void binaryImage;
const fields = {
  ...profileColumns,
  activeDepartment: activeDoctorDepartment,
  image_url: sql<
    string | null
  >`case when ${doctors.image_revision} is null then null else '/api/v1/public/doctors/' || ${doctors.id} || '/image?v=' || ${doctors.image_revision} end`,
  published: care.published,
  reviewedAt: care.reviewedAt,
  reviewedBy: care.reviewedBy,
  reviewEvidence: care.reviewEvidence,
};
type Doctor = Omit<typeof doctors.$inferSelect, 'image_data'> & { image_data?: Buffer | null };

@Injectable()
export class DoctorsService {
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
    return and(
      eq(care.published, true),
      sql`exists (select 1 from ${doctorDepartments} dd inner join ${departments} dep on dep.id=dd.department_id where dd.doctor_id=${doctors.id} and dep.is_active=true)`,
      gte(care.reviewedAt, new Date(Date.now() - 180 * 86400000)),
    );
  }
  private present<T extends { reviewedBy: unknown; reviewEvidence: unknown }>(
    row: T,
    admin: boolean,
  ) {
    return admin ? row : { ...row, reviewedBy: undefined, reviewEvidence: undefined };
  }
  async list(query: unknown, admin = false) {
    const q = this.parse(admin ? doctorAdminQuery : doctorQuery, query),
      conditions: SQL[] = [];
    if (!admin) conditions.push(this.visible()!);
    if (q.city) conditions.push(sql`lower(btrim(${doctors.city}))=${q.city.toLowerCase()}`);
    if (q.state) conditions.push(sql`lower(btrim(${doctors.state}))=${q.state.toLowerCase()}`);
    if (q.department_id)
      conditions.push(
        sql`exists(select 1 from ${doctorDepartments} dd inner join ${departments} dep on dep.id=dd.department_id where dd.doctor_id=${doctors.id} and dd.department_id=${q.department_id} ${admin ? sql`` : sql`and dep.is_active=true`})`,
      );
    if (q.hospital_id)
      conditions.push(
        sql`exists(select 1 from ${affiliations} a inner join ${care} c on c.id=a.hospital_id where a.doctor_id=${doctors.id} and a.hospital_id=${q.hospital_id} ${admin ? sql`` : sql`and c.published=true and c.reviewed_at >= ${new Date(Date.now() - 180 * 86400000)}`})`,
      );
    if (q.search) {
      const term = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(doctors.name_en, term),
          ilike(doctors.name_hi, term),
          ilike(doctors.address_line1, term),
          ilike(doctors.city, term),
          ilike(doctors.landmark, term),
        )!,
      );
    }
    const baseWhere = and(...conditions), statusPredicates = directoryPredicates('doctors');
    const status = directoryStatusInput.parse('status' in q ? q.status : 'all');
    if (admin && status !== 'all') conditions.push(status === 'published' ? sql`${care.published}=true` : statusPredicates[status]);
    const summary = admin ? (await this.database.db.select(directoryCountFields(statusPredicates)).from(doctors).innerJoin(care, eq(care.id, doctors.id)).where(baseWhere))[0] : undefined;
    const where = and(...conditions),
      [items, total] = await Promise.all([
        this.database.db
          .select(fields)
          .from(doctors)
          .innerJoin(care, eq(care.id, doctors.id))
          .where(where)
          .orderBy(
            asc(
              q.language === 'hi'
                ? sql`coalesce(nullif(${doctors.name_hi},''),${doctors.name_en})`
                : sql`lower(${doctors.name_en})`,
            ),
            asc(doctors.id),
          )
          .limit(q.limit)
          .offset((q.page - 1) * q.limit),
        this.database.db
          .select({ count: count() })
          .from(doctors)
          .innerJoin(care, eq(care.id, doctors.id))
          .where(where),
      ]);
    return {
      items: await Promise.all(
        items.map(async (row) => ({
          ...this.present(row, admin),
          ...(admin ? { adminStatus: directoryRowStatus('doctors', row) } : {}),
          ...(await this.relations(this.database.db, row.id, admin)),
        })),
      ),
      ...(admin ? { summary } : {}),
      total: total[0]!.count,
      page: q.page,
      hasNext: q.page * q.limit < total[0]!.count,
    };
  }
  async detail(id: string, admin = false) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select(fields)
      .from(doctors)
      .innerJoin(care, eq(care.id, doctors.id))
      .where(and(eq(doctors.id, id), admin ? undefined : this.visible()))
      .limit(1);
    if (!row) throw new NotFoundException('Doctor not found or awaiting source review.');
    return { ...this.present(row, admin), ...(await this.relations(this.database.db, id, admin)) };
  }
  private async write<T>(operation: (tx: Transaction) => Promise<T>) {
    try {
      return await this.database.db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(6389022)`);
        await tx.execute(sql`select pg_advisory_xact_lock(6389023)`);
        await tx.execute(lock);
        return operation(tx);
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('This source key already exists. Use its existing record.');
      if (getDatabaseErrorCode(error) === '23503')
        throw new ConflictException('Doctor has linked records. Withdraw it instead of deleting.');
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
      .values({ actorId, action: `doctors.${action}`, targetId, outcome: 'succeeded', metadata });
  }
  private projection(value: DoctorInput) {
    return {
      sourceKey: value.source_key,
      kind: 'doctor',
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
        specialties: [],
        qualifications: value.qualifications.join(', '),
        registration: value.registration_number,
        languages: value.languages,
        providerType: 'doctor',
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
  private async relations(tx: Transaction | DatabaseService['db'], id: string, admin: boolean) {
    const ds = await tx
      .select({
        id: departments.id,
        source_key: departments.source_key,
        name_en: departments.name_en,
        name_hi: departments.name_hi,
        is_active: departments.is_active,
      })
      .from(doctorDepartments)
      .innerJoin(departments, eq(departments.id, doctorDepartments.department_id))
      .where(
        and(
          eq(doctorDepartments.doctor_id, id),
          admin ? undefined : eq(departments.is_active, true),
        ),
      )
      .orderBy(asc(departments.id));
    const hs = await tx
      .select({
        ...getTableColumns(affiliations),
        name_en: hospitals.name_en,
        name_hi: hospitals.name_hi,
        city: hospitals.city,
      })
      .from(affiliations)
      .innerJoin(hospitals, eq(hospitals.id, affiliations.hospital_id))
      .innerJoin(care, eq(care.id, hospitals.id))
      .where(
        and(
          eq(affiliations.doctor_id, id),
          admin
            ? undefined
            : and(
                eq(care.published, true),
                gte(care.reviewedAt, new Date(Date.now() - 180 * 86400000)),
              ),
        ),
      )
      .orderBy(asc(affiliations.hospital_id));
    return {
      department_ids: ds.map((d) => d.id),
      departments: ds,
      affiliations: hs.map(({ doctor_id: _doctor, ...a }) => {
        void _doctor;
        return a;
      }),
    };
  }
  private async validateLinks(tx: Transaction, value: DoctorInput) {
    const ds = value.department_ids.length
      ? await tx
          .select({ id: departments.id })
          .from(departments)
          .where(inArray(departments.id, value.department_ids))
      : [];
    const ids = value.affiliations.map((a) => a.hospital_id);
    const hs = ids.length
      ? await tx.select({ id: hospitals.id }).from(hospitals).where(inArray(hospitals.id, ids))
      : [];
    if (ds.length !== value.department_ids.length || hs.length !== ids.length)
      throw new BadRequestException('Every department and hospital must already exist.');
  }
  private async saveLinks(tx: Transaction, id: string, value: DoctorInput) {
    await tx.delete(doctorDepartments).where(eq(doctorDepartments.doctor_id, id));
    if (value.department_ids.length)
      await tx
        .insert(doctorDepartments)
        .values(value.department_ids.map((department_id) => ({ doctor_id: id, department_id })));
    await tx.delete(affiliations).where(eq(affiliations.doctor_id, id));
    await tx.delete(legacyLinks).where(eq(legacyLinks.doctorId, id));
    if (value.affiliations.length) {
      await tx
        .insert(affiliations)
        .values(value.affiliations.map((a) => ({ ...a, doctor_id: id })));
      await tx
        .insert(legacyLinks)
        .values(value.affiliations.map((a) => ({ doctorId: id, hospitalId: a.hospital_id })));
    }
    const names = value.department_ids.length
      ? await tx
          .select({ name: departments.name_en })
          .from(departments)
          .where(inArray(departments.id, value.department_ids))
      : [];
    await tx
      .update(care)
      .set({
        details: sql`jsonb_set(${care.details}, '{specialties}', ${JSON.stringify(names.map((d) => d.name))}::jsonb)`,
      })
      .where(eq(care.id, id));
  }
  private async data(tx: Transaction, row: Doctor) {
    const {
      id: _id,
      version: _v,
      created_at: _c,
      updated_at: _u,
      image_data: _image,
      image_alt: _alt,
      image_revision: _revision,
      ...profile
    } = row;
    void _id;
    void _v;
    void _c;
    void _u;
    void _image;
    void _alt;
    void _revision;
    const links = await this.relations(tx, row.id, true);
    return {
      ...profile,
      department_ids: links.department_ids,
      affiliations: links.affiliations.map(({ name_en: _n, name_hi: _h, city: _city, ...a }) => {
        void _n;
        void _h;
        void _city;
        return a;
      }),
    };
  }
  private async insert(tx: Transaction, value: DoctorInput) {
    await this.validateLinks(tx, value);
    const id = randomUUID();
    await tx.insert(care).values({ id, ...this.projection(value) });
    const [row] = await tx
      .insert(doctors)
      .values({ id, ...this.profile(value) })
      .returning();
    await this.saveLinks(tx, id, value);
    return row!;
  }
  private async change(tx: Transaction, row: Doctor, value: DoctorInput) {
    await this.validateLinks(tx, value);
    const [saved] = await tx
      .update(doctors)
      .set({ ...this.profile(value), version: row.version + 1, updated_at: new Date() })
      .where(and(eq(doctors.id, row.id), eq(doctors.version, row.version)))
      .returning();
    if (!saved) throw new ConflictException('Doctor changed. Reload first.');
    await tx.update(care).set(this.projection(value)).where(eq(care.id, row.id));
    await this.saveLinks(tx, row.id, value);
    return saved;
  }
  create(actor: string, body: unknown) {
    const value = this.parse(doctorInput, body);
    return this.write(async (tx) => {
      const row = await this.insert(tx, value);
      await this.audit(tx, actor, 'create', row.id);
      return { ...omitProviderImage(row), published: false };
    });
  }
  update(actor: string, id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const { expectedVersion, ...changes } = this.parse(doctorUpdate, body);
    return this.write(async (tx) => {
      const [row] = await tx.select().from(doctors).where(eq(doctors.id, id));
      if (!row || row.version !== expectedVersion)
        throw new ConflictException('Doctor changed or was removed. Reload first.');
      const value = this.parse(doctorInput, { ...(await this.data(tx, row)), ...changes });
      const saved = await this.change(tx, row, value);
      await this.audit(tx, actor, 'update', id);
      return { ...omitProviderImage(saved), published: false, reviewRequired: true };
    });
  }
  review(actor: string, id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const value = this.parse(doctorReview, body);
    return this.write(async (tx) => {
      const [row] = await tx.select().from(doctors).where(eq(doctors.id, id));
      if (!row || row.version !== value.expectedVersion)
        throw new ConflictException('Doctor changed. Reload before reviewing.');
      const active = await tx
        .select({ id: departments.id })
        .from(doctorDepartments)
        .innerJoin(departments, eq(departments.id, doctorDepartments.department_id))
        .where(and(eq(doctorDepartments.doctor_id, id), eq(departments.is_active, true)));
      if (
        value.publish &&
        (!row.source_url ||
          !row.address_line1 ||
          !row.phone_1 ||
          !row.registration_number ||
          !row.medical_council ||
          !row.qualifications.length ||
          !active.length)
      )
        throw new BadRequestException(
          'A source URL, address, phone, registration, medical council, qualifications and active department are required before publication.',
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
        .update(doctors)
        .set({ version: row.version + 1, updated_at: new Date() })
        .where(eq(doctors.id, id))
        .returning();
      await this.audit(tx, actor, value.publish ? 'publish' : 'withdraw', id);
      return { ...omitProviderImage(saved!), published: value.publish };
    });
  }
  remove(actor: string, id: string, query: unknown) {
    this.parse(z.uuid(), id);
    const { expected_version } = this.parse(doctorDelete, query);
    return this.write(async (tx) => {
      const [row] = await tx.select().from(doctors).where(eq(doctors.id, id));
      if (!row || row.version !== expected_version)
        throw new ConflictException('Doctor changed or was removed. Reload first.');
      await tx.delete(legacyLinks).where(eq(legacyLinks.doctorId, id));
      await tx.delete(care).where(eq(care.id, id));
      await this.audit(tx, actor, 'delete', id);
      return { deleted: true };
    });
  }
  private profile(value: DoctorInput) {
    const { department_ids: _d, affiliations: _a, ...profile } = value;
    void _d;
    void _a;
    return profile;
  }
  private async masters(tx: Transaction | DatabaseService['db']) {
    return {
      departments: await tx.select().from(departments).orderBy(asc(departments.id)),
      hospitals: await tx
        .select({
          id: hospitals.id,
          source_key: hospitals.source_key,
          name_en: hospitals.name_en,
          city: hospitals.city,
          version: hospitals.version,
        })
        .from(hospitals)
        .orderBy(asc(hospitals.id)),
      care: await tx
        .select({
          id: care.id,
          published: care.published,
          reviewedAt: care.reviewedAt,
          updatedAt: care.updatedAt,
        })
        .from(care)
        .where(eq(care.kind, 'hospital'))
        .orderBy(asc(care.id)),
    };
  }
  private async prepared(file?: Express.Multer.File) {
    try {
      return await prepareDoctors(file, await this.masters(this.database.db));
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid doctor file.',
      );
    }
  }
  private async current(tx: Transaction | DatabaseService['db']) {
    const profiles = await tx
      .select(fields)
      .from(doctors)
      .innerJoin(care, eq(care.id, doctors.id))
      .orderBy(asc(doctors.id));
    return {
      profiles,
      masters: await this.masters(tx),
      departments: await tx
        .select()
        .from(doctorDepartments)
        .orderBy(asc(doctorDepartments.doctor_id), asc(doctorDepartments.department_id)),
      affiliations: await tx
        .select()
        .from(affiliations)
        .orderBy(asc(affiliations.doctor_id), asc(affiliations.hospital_id)),
    };
  }
  private async plan(
    prepared: Awaited<ReturnType<typeof prepareDoctors>>,
    existing: Awaited<ReturnType<DoctorsService['current']>>,
    tx: Transaction | DatabaseService['db'],
  ) {
    const keys = new Map(existing.profiles.map((row) => [row.source_key, row])),
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
      ignoredMetadataFields: prepared.ignoredMetadataFields,
      doctors: prepared.rows.length,
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
      .update('doctors-import-v1:' + value)
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
    await this.prepared(file);
    const [payload, signature, ...rest] = this.parse(z.string().min(1).max(4096), token).split('.');
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
      const prepared = await prepareDoctors(file, await this.masters(tx));
      const existing = await this.current(tx);
      if (hash(JSON.stringify(existing)) !== authorization.state)
        throw new ConflictException('Doctors changed after preview. Preview again.');
      const plan = await this.plan(prepared, existing, tx);
      if (plan.errorCount)
        throw new BadRequestException({
          message: 'Fix all import errors before applying.',
          errors: plan.errors,
        });
      const keys = new Map(existing.profiles.map((row) => [row.source_key, row]));
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
      .select({ image_data: doctors.image_data, image_revision: doctors.image_revision })
      .from(doctors)
      .innerJoin(care, eq(care.id, doctors.id))
      .where(and(eq(doctors.id, id), admin ? undefined : this.visible()))
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
        .select({ version: doctors.version })
        .from(doctors)
        .where(eq(doctors.id, id));
      if (!existing || existing.version !== input.expectedVersion)
        throw new ConflictException('Record changed. Reload before uploading.');
      const revision = randomUUID();
      await tx
        .update(doctors)
        .set({
          image_data: image,
          image_alt: input.alt,
          image_revision: revision,
          version: existing.version + 1,
          updated_at: new Date(),
        })
        .where(eq(doctors.id, id));
      await tx
        .update(care)
        .set({
          imageUrl: `/api/v1/public/doctors/${id}/image?v=${revision}`,
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
        image_url: `/api/v1/public/doctors/${id}/image?v=${revision}`,
        image_alt: input.alt,
        published: false,
        reviewRequired: true,
      };
    });
  }
  removeImage(actor: string, id: string, query: unknown) {
    this.parse(z.uuid(), id);
    const { expected_version } = this.parse(doctorDelete, query);
    return this.write(async (tx) => {
      const [existing] = await tx
        .select({ version: doctors.version })
        .from(doctors)
        .where(eq(doctors.id, id));
      if (!existing || existing.version !== expected_version)
        throw new ConflictException('Record changed. Reload before removing the image.');
      await tx
        .update(doctors)
        .set({
          image_data: null,
          image_alt: '',
          image_revision: null,
          version: existing.version + 1,
          updated_at: new Date(),
        })
        .where(eq(doctors.id, id));
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
