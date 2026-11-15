import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import { userAccounts } from '../../../database/schema';
import { getDatabaseErrorCode } from '../../../common/errors/database-error';
import { PasswordHashingService } from '../../authentication/services/password-hashing.service';

const phrase = 'RESET ALL APP DATA';
const passwordInput = z.object({ password: z.string().min(1).max(1024) }).strict();
const applyInput = passwordInput.extend({
  confirmation: z.literal(phrase),
  previewToken: z.string().max(65536),
});
type Executor = Pick<DatabaseService['db'], 'execute' | 'select'>;
type Inventory = { database: string; tables: { name: string; records: string }[] };

@Injectable()
export class DatabaseResetService {
  private readonly logger = new Logger(DatabaseResetService.name);
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordHashingService,
    private readonly config: ConfigService,
  ) {}

  private parse<T>(schema: z.ZodType<T>, body: unknown): T {
    const result = schema.safeParse(body);
    if (!result.success)
      throw new BadRequestException('Provide your password and the exact reset confirmation.');
    return result.data;
  }

  private async authenticate(db: Executor, actor: string, password: string) {
    const [user] = await db.select().from(userAccounts).where(eq(userAccounts.id, actor)).limit(1);
    if (
      user?.role !== 'super_admin' ||
      user.status !== 'active' ||
      !(await this.passwords.verify(user.passwordHash, password))
    )
      throw new UnauthorizedException('Your current super-admin password is required.');
  }

  private async inventory(db: Executor): Promise<Inventory> {
    const catalog = JSON.parse(
      readFileSync(join(__dirname, '../../../../database/table-catalog.json'), 'utf8'),
    ) as { table: string; previousTable?: string }[];
    const allowed = new Set(
      catalog.flatMap((entry) =>
        [entry.table, entry.previousTable].filter((name): name is string => Boolean(name)),
      ),
    );
    const result = await db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
    );
    const names = result.rows.map((row) => String(row.table_name));
    if (!names.length || names.some((name) => !allowed.has(name)))
      throw new ConflictException(
        'Unrecognized database tables. Review the table catalog before resetting.',
      );
    const identity = await db.execute(sql`select current_database() as name`);
    const tables = [];
    for (const name of names) {
      const count = await db.execute(
        sql.raw(`select count(*)::text as records from ${this.identifier(name)}`),
      );
      tables.push({ name, records: String(count.rows[0]?.records) });
    }
    return { database: String(identity.rows[0]?.name), tables };
  }

  private identifier(name: string) {
    return `"public"."${name.replace(/"/g, '""')}"`;
  }
  private signature(value: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_ACCESS_SECRET'))
      .update('database-reset-v1:' + value)
      .digest('hex');
  }
  private fingerprint(inventory: Inventory) {
    return this.signature(
      JSON.stringify({ target: this.config.getOrThrow<string>('DATABASE_URL'), inventory }),
    );
  }

  async preview(actor: string, body: unknown) {
    const { password } = this.parse(passwordInput, body);
    await this.authenticate(this.database.db, actor, password);
    const inventory = await this.inventory(this.database.db);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const payload = Buffer.from(
      JSON.stringify({ actor, expiresAt, fingerprint: this.fingerprint(inventory) }),
    ).toString('base64url');
    return {
      ...inventory,
      host: new URL(this.config.getOrThrow<string>('DATABASE_URL')).hostname,
      environment: this.config.get<string>('NODE_ENV'),
      confirmation: phrase,
      expiresAt,
      previewToken: payload + '.' + this.signature(payload),
    };
  }

  async apply(actor: string, body: unknown) {
    const input = this.parse(applyInput, body);
    const [payload = '', signature = ''] = input.previewToken.split('.');
    const expected = this.signature(payload);
    if (
      input.previewToken.split('.').length !== 2 ||
      !/^[a-f0-9]{64}$/.test(signature) ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      throw new BadRequestException('Invalid reset preview. Review the database again.');
    let challenge: { actor: string; expiresAt: number; fingerprint: string };
    try {
      challenge = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as typeof challenge;
    } catch {
      throw new BadRequestException('Invalid reset preview.');
    }
    if (
      challenge.actor !== actor ||
      !Number.isFinite(challenge.expiresAt) ||
      challenge.expiresAt < Date.now()
    )
      throw new BadRequestException('Reset preview expired. Review the database again.');
    const result = await this.database.db
      .transaction(async (tx) => {
        await tx.execute(sql`set local lock_timeout = '10s'`);
        await tx.execute(sql`set local statement_timeout = '60s'`);
        const before = await this.inventory(tx);
        const identifiers = before.tables.map((table) => this.identifier(table.name)).join(', ');
        await tx.execute(sql.raw(`LOCK TABLE ${identifiers} IN ACCESS EXCLUSIVE MODE`));
        await this.authenticate(tx, actor, input.password);
        const locked = await this.inventory(tx);
        if (challenge.expiresAt < Date.now())
          throw new BadRequestException('Reset preview expired. Review the database again.');
        if (this.fingerprint(locked) !== challenge.fingerprint)
          throw new ConflictException(
            'Database records changed. Review the database again before resetting.',
          );
        // No CASCADE: references outside the approved app tables must abort the transaction.
        await tx.execute(sql.raw(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY`));
        const after = await this.inventory(tx);
        if (after.tables.some((table) => table.records !== '0'))
          throw new ConflictException('Reset verification failed. No changes were committed.');
        return { reset: true, tableCount: after.tables.length, remainingRecords: 0 };
      })
      .catch((error: unknown) => {
        if (['0A000', '55P03', '40P01', '57014'].includes(getDatabaseErrorCode(error) ?? ''))
          throw new ConflictException(
            'The database is busy or has external dependencies. No reset was committed. Review the database and try again.',
          );
        throw error;
      });
    // All audit records and administrators were deleted; keep the completion event in server logs.
    this.logger.warn(
      'Application database reset completed; all app records and administrator sessions removed.',
    );
    return result;
  }
}
