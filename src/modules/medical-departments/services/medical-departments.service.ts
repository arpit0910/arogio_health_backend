import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { and, asc, count, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import {
  administrationAuditLogs,
  medicalDepartments as departments,
} from '../../../database/schema';
import { isUniqueViolation, getDatabaseErrorCode } from '../../../common/errors/database-error';
import {
  departmentInput,
  departmentUpdate,
  departmentQuery,
  departmentAdminQuery,
  departmentDelete,
} from '../requests/medical-departments.input';
import { prepareDepartments } from '../imports/medical-departments.import';

const lock = sql`select pg_advisory_xact_lock(6389022)`;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
type Department = typeof departments.$inferSelect;
const state = (rows: Department[]) => hash(JSON.stringify(rows));
type Transaction = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];

@Injectable()
export class MedicalDepartmentsService {
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
    const q = this.parse(admin ? departmentAdminQuery : departmentQuery, query);
    const conditions: SQL[] = [];
    if (!admin) conditions.push(eq(departments.is_active, true));
    else if ('status' in q && q.status !== 'all')
      conditions.push(eq(departments.is_active, q.status === 'active'));
    if (q.search) {
      const term = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(departments.name_en, term),
          ilike(departments.name_hi, term),
          ilike(departments.description_en, term),
          ilike(departments.description_hi, term),
        )!,
      );
    }
    const where = and(...conditions);
    const [items, totals] = await Promise.all([
      this.database.db
        .select()
        .from(departments)
        .where(where)
        .orderBy(
          asc(
            q.language === 'hi'
              ? sql`coalesce(nullif(${departments.name_hi}, ''), ${departments.name_en})`
              : sql`lower(${departments.name_en})`,
          ),
          asc(departments.id),
        )
        .limit(q.limit)
        .offset((q.page - 1) * q.limit),
      this.database.db.select({ count: count() }).from(departments).where(where),
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
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), admin ? undefined : eq(departments.is_active, true)))
      .limit(1);
    if (!row) throw new NotFoundException('Department not found.');
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
      action: `medical-departments.${action}`,
      targetId,
      outcome: 'succeeded',
      metadata,
    });
  }
  private async write<T>(operation: (tx: Transaction) => Promise<T>) {
    try {
      return await this.database.db.transaction(async (tx) => {
        await tx.execute(lock);
        return operation(tx);
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('A department already uses this source key or English name.');
      if (getDatabaseErrorCode(error) === '23503')
        throw new ConflictException('This department is still referenced. Deactivate it instead.');
      throw error;
    }
  }
  create(actorId: string, body: unknown) {
    const input = this.parse(departmentInput, body);
    return this.write(async (tx) => {
      const [row] = await tx.insert(departments).values(input).returning();
      await this.audit(tx, actorId, 'create', row!.id);
      return row!;
    });
  }
  update(actorId: string, id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const { expectedVersion, ...changes } = this.parse(departmentUpdate, body);
    return this.write(async (tx) => {
      const [row] = await tx
        .update(departments)
        .set({ ...changes, updated_at: new Date(), version: sql`${departments.version} + 1` })
        .where(and(eq(departments.id, id), eq(departments.version, expectedVersion)))
        .returning();
      if (!row)
        throw new ConflictException('Department changed or was removed. Reload it before editing.');
      await this.audit(tx, actorId, 'update', id);
      return row;
    });
  }
  remove(actorId: string, id: string, query: unknown) {
    this.parse(z.uuid(), id);
    const { expected_version } = this.parse(departmentDelete, query);
    return this.write(async (tx) => {
      const rows = await tx
        .delete(departments)
        .where(and(eq(departments.id, id), eq(departments.version, expected_version)))
        .returning({ id: departments.id });
      if (!rows.length)
        throw new ConflictException(
          'Department changed or was removed. Reload it before deleting.',
        );
      await this.audit(tx, actorId, 'delete', id);
      return { deleted: true };
    });
  }
  private async prepared(file?: Express.Multer.File) {
    try {
      return await prepareDepartments(file);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid import file.',
      );
    }
  }
  private plan(prepared: Awaited<ReturnType<typeof prepareDepartments>>, existing: Department[]) {
    const errors = [...prepared.errors],
      keys = new Map(existing.map((row) => [row.source_key, row])),
      names = new Map(existing.map((row) => [row.name_en.trim().toLowerCase(), row.source_key]));
    let creates = 0,
      updates = 0;
    for (const { row, value } of prepared.rows) {
      const owner = names.get(value.name_en.toLowerCase());
      if (owner && owner !== value.source_key)
        errors.push({
          row,
          message:
            'English name belongs to a different source key. Correct the identity before importing.',
        });
      if (keys.has(value.source_key)) updates++;
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
      .update('medical-departments-import-v1:' + payload)
      .digest('base64url');
  }
  async preview(actorId: string, file?: Express.Multer.File) {
    const prepared = await this.prepared(file);
    const existing = await this.database.db.select().from(departments).orderBy(asc(departments.id));
    const plan = this.plan(prepared, existing);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const payload = Buffer.from(
      JSON.stringify({ actorId, hash: hash(file!.buffer), state: state(existing), expiresAt }),
    ).toString('base64url');
    return {
      ...plan,
      expiresAt: new Date(expiresAt).toISOString(),
      previewToken: plan.errorCount ? null : payload + '.' + this.sign(payload),
    };
  }
  async apply(actorId: string, file: Express.Multer.File | undefined, token: unknown) {
    const prepared = await this.prepared(file);
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
      const existing = await tx.select().from(departments).orderBy(asc(departments.id));
      if (state(existing) !== authorization.state)
        throw new ConflictException('Departments changed after preview. Preview again.');
      const plan = this.plan(prepared, existing);
      if (plan.errorCount)
        throw new BadRequestException({
          message: 'Fix all import errors before applying.',
          errors: plan.errors,
        });
      for (const { value } of prepared.rows)
        await tx
          .insert(departments)
          .values(value)
          .onConflictDoUpdate({
            target: departments.source_key,
            set: { ...value, version: sql`${departments.version} + 1`, updated_at: new Date() },
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
