import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { and, asc, count, eq, ilike, or, sql, type SQL, getTableColumns } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import {
  administrationAuditLogs,
  medicalDiseases as diseases,
  medicalDepartments as departments,
} from '../../../database/schema';
import { isUniqueViolation, getDatabaseErrorCode } from '../../../common/errors/database-error';
import {
  diseaseInput,
  diseaseUpdate,
  diseaseQuery,
  diseaseAdminQuery,
  diseaseDelete,
} from '../requests/diseases.input';
import { prepareDiseases } from '../imports/diseases.import';

const lock = sql`select pg_advisory_xact_lock(6389024)`;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
type Disease = typeof diseases.$inferSelect;
type Transaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];

@Injectable()
export class DiseasesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
  ) {}
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
      throw new BadRequestException(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      );
    return parsed.data;
  }
  async list(query: unknown, admin = false) {
    const q = this.parse(admin ? diseaseAdminQuery : diseaseQuery, query);
    const conditions: SQL[] = [];
    if (!admin) conditions.push(eq(diseases.is_active, true), eq(departments.is_active, true));
    if (q.department_id) conditions.push(eq(diseases.department_id, q.department_id));
    else if ('status' in q && q.status !== 'all')
      conditions.push(eq(diseases.is_active, q.status === 'active'));
    if (q.search) {
      const term = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(diseases.name_en, term),
          ilike(diseases.name_hi, term),
          ilike(diseases.description_en, term),
          ilike(diseases.description_hi, term),
        )!,
      );
    }
    const where = and(...conditions);
    const [items, totals] = await Promise.all([
      this.database.db
        .select({
          ...getTableColumns(diseases),
          department: {
            id: departments.id,
            name_en: departments.name_en,
            name_hi: departments.name_hi,
            is_active: departments.is_active,
          },
        })
        .from(diseases)
        .innerJoin(departments, eq(departments.id, diseases.department_id))
        .where(where)
        .orderBy(
          asc(
            q.language === 'hi'
              ? sql`coalesce(nullif(${diseases.name_hi}, ''), ${diseases.name_en})`
              : sql`lower(${diseases.name_en})`,
          ),
          asc(diseases.id),
        )
        .limit(q.limit)
        .offset((q.page - 1) * q.limit),
      this.database.db
        .select({ count: count() })
        .from(diseases)
        .innerJoin(departments, eq(departments.id, diseases.department_id))
        .where(where),
    ]);
    return {
      items,
      total: totals[0]!.count,
      page: q.page,
      hasNext: q.page * q.limit < totals[0]!.count,
    };
  }
  async detail(id: string, admin = false) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select({
        ...getTableColumns(diseases),
        department: {
          id: departments.id,
          name_en: departments.name_en,
          name_hi: departments.name_hi,
          is_active: departments.is_active,
        },
      })
      .from(diseases)
      .innerJoin(departments, eq(departments.id, diseases.department_id))
      .where(
        and(
          eq(diseases.id, id),
          admin ? undefined : and(eq(diseases.is_active, true), eq(departments.is_active, true)),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Disease not found.');
    return row;
  }
  private async audit(
    tx: Transaction,
    actorId: string,
    action: string,
    targetId: string | null,
    metadata: Record<string, unknown> = {},
  ) {
    await tx.insert(administrationAuditLogs).values({
      actorId,
      action: `diseases.${action}`,
      targetId,
      outcome: 'succeeded',
      metadata,
    });
  }
  private async write<T>(operation: (tx: Transaction) => Promise<T>) {
    try {
      return await this.database.db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(6389022)`);
        await tx.execute(lock);
        return operation(tx);
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('A disease already uses this record key or English name.');
      if (getDatabaseErrorCode(error) === '23503')
        throw new ConflictException('This disease is still referenced. Deactivate it instead.');
      throw error;
    }
  }
  create(actorId: string, body: unknown) {
    const input = this.parse(diseaseInput, body);
    return this.write(async (tx) => {
      const [department] = await tx
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.id, input.department_id));
      if (!department) throw new BadRequestException('Choose an existing medical department.');
      const [row] = await tx.insert(diseases).values(input).returning();
      await this.audit(tx, actorId, 'create', row!.id);
      return row!;
    });
  }
  update(actorId: string, id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const { expectedVersion, ...changes } = this.parse(diseaseUpdate, body);
    return this.write(async (tx) => {
      if (changes.department_id) {
        const [department] = await tx
          .select({ id: departments.id })
          .from(departments)
          .where(eq(departments.id, changes.department_id));
        if (!department) throw new BadRequestException('Choose an existing medical department.');
      }
      const [row] = await tx
        .update(diseases)
        .set({ ...changes, updated_at: new Date(), version: sql`${diseases.version} + 1` })
        .where(and(eq(diseases.id, id), eq(diseases.version, expectedVersion)))
        .returning();
      if (!row)
        throw new ConflictException('Disease changed or was removed. Reload it before editing.');
      await this.audit(tx, actorId, 'update', id);
      return row;
    });
  }
  remove(actorId: string, id: string, query: unknown) {
    this.parse(z.uuid(), id);
    const { expected_version } = this.parse(diseaseDelete, query);
    return this.write(async (tx) => {
      const rows = await tx
        .delete(diseases)
        .where(and(eq(diseases.id, id), eq(diseases.version, expected_version)))
        .returning({ id: diseases.id });
      if (!rows.length)
        throw new ConflictException('Disease changed or was removed. Reload it before deleting.');
      await this.audit(tx, actorId, 'delete', id);
      return { deleted: true };
    });
  }
  private async prepared(
    file: Express.Multer.File | undefined,
    masters: (typeof departments.$inferSelect)[],
  ) {
    try {
      return await prepareDiseases(file, masters);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid import file.',
      );
    }
  }
  private plan(prepared: Awaited<ReturnType<typeof prepareDiseases>>, existing: Disease[]) {
    const errors = [...prepared.errors],
      keys = new Map(existing.map((row) => [row.record_key, row])),
      names = new Map(existing.map((row) => [row.name_en.trim().toLowerCase(), row.record_key]));
    let creates = 0,
      updates = 0;
    for (const { row, value } of prepared.rows) {
      const owner = names.get(value.name_en.toLowerCase());
      if (owner && owner !== value.record_key)
        errors.push({
          row,
          message:
            'English name belongs to a different record key. Correct the identity before importing.',
        });
      if (keys.has(value.record_key)) updates++;
      else creates++;
    }
    return {
      totalRows: prepared.totalRows,
      creates,
      updates,
      activeRows: prepared.rows.filter((row) => row.value.is_active).length,
      errorCount: errors.length,
      errors,
      sample: prepared.rows.slice(0, 10).map((row) => row.value),
    };
  }
  private sign(payload: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_ACCESS_SECRET'))
      .update('diseases-import-v1:' + payload)
      .digest('base64url');
  }
  async preview(actorId: string, file?: Express.Multer.File) {
    const masters = await this.database.db.select().from(departments).orderBy(asc(departments.id));
    const prepared = await this.prepared(file, masters);
    const existing = await this.database.db.select().from(diseases).orderBy(asc(diseases.id));
    const plan = this.plan(prepared, existing);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const payload = Buffer.from(
      JSON.stringify({
        actorId,
        hash: hash(file!.buffer),
        state: hash(JSON.stringify({ existing, masters })),
        expiresAt,
      }),
    ).toString('base64url');
    return {
      ...plan,
      expiresAt: new Date(expiresAt).toISOString(),
      previewToken: plan.errorCount ? null : payload + '.' + this.sign(payload),
    };
  }
  async apply(actorId: string, file: Express.Multer.File | undefined, token: unknown) {
    const masters = await this.database.db.select().from(departments).orderBy(asc(departments.id));
    const prepared = await this.prepared(file, masters);
    const raw = this.parse(z.string().min(1).max(4096), token),
      parts = raw.split('.');
    if (parts.length !== 2) throw new BadRequestException('Preview this file before applying.');
    const signature = Buffer.from(this.sign(parts[0]!)),
      received = Buffer.from(parts[1]!);
    if (signature.length !== received.length || !timingSafeEqual(signature, received))
      throw new BadRequestException('Import preview is invalid. Preview again.');
    let authorization: { actorId: string; hash: string; state: string; expiresAt: number };
    try {
      authorization = z
        .object({ actorId: z.string(), hash: z.string(), state: z.string(), expiresAt: z.number() })
        .parse(JSON.parse(Buffer.from(parts[0]!, 'base64url').toString()));
    } catch {
      throw new BadRequestException('Import preview is invalid. Preview again.');
    }
    if (
      authorization.actorId !== actorId ||
      authorization.hash !== hash(file!.buffer) ||
      authorization.expiresAt <= Date.now()
    )
      throw new ConflictException('File, administrator or preview expiry changed. Preview again.');
    return this.write(async (tx) => {
      const existing = await tx.select().from(diseases).orderBy(asc(diseases.id));
      const currentMasters = await tx.select().from(departments).orderBy(asc(departments.id));
      if (hash(JSON.stringify({ existing, masters: currentMasters })) !== authorization.state)
        throw new ConflictException('Diseases changed after preview. Preview again.');
      const plan = this.plan(prepared, existing);
      if (plan.errorCount)
        throw new BadRequestException({
          message: 'Fix all import errors before applying.',
          errors: plan.errors,
        });
      for (const { value } of prepared.rows)
        await tx
          .insert(diseases)
          .values(value)
          .onConflictDoUpdate({
            target: diseases.record_key,
            set: { ...value, version: sql`${diseases.version} + 1`, updated_at: new Date() },
          });
      await this.audit(tx, actorId, 'import', null, {
        creates: plan.creates,
        updates: plan.updates,
        rows: plan.totalRows,
      });
      return { imported: plan.totalRows, creates: plan.creates, updates: plan.updates };
    });
  }
}
