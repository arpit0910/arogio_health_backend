import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import sharp from 'sharp';
import { DatabaseService } from '../../database/database.service';
import {
  adminAudit,
  authSessions,
  banners,
  users,
  waterLogs,
  cycleEntries,
  cyclePeriods,
  wellnessSettings,
} from '../../database/schema';
import { toSafeUser } from '../auth/dto/auth-response.dto';
import { PasswordService } from '../auth/password.service';
import { WellnessService } from '../wellness/wellness.service';
import { UsersService } from '../users/users.service';
const routes = z.enum([
  '/home',
  '/water',
  '/medicines',
  '/cycle',
  '/activity',
  '/health',
  '/explore',
  '/profile',
  '/connected-health',
]);
@Injectable()
export class AdminService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly wellness: WellnessService,
    private readonly profiles: UsersService,
  ) {}
  private parse<T>(schema: z.ZodType<T>, input: unknown) {
    const result = schema.safeParse(input);
    if (!result.success)
      throw new BadRequestException(result.error.issues.map((i) => i.message).join(' '));
    return result.data;
  }
  async audit<T>(
    actorId: string,
    action: string,
    targetId: string | null,
    operation: () => Promise<T>,
  ) {
    const [entry] = await this.database.db
      .insert(adminAudit)
      .values({ actorId, action, targetId })
      .returning({ id: adminAudit.id });
    try {
      const result = await operation();
      await this.database.db
        .update(adminAudit)
        .set({ outcome: 'succeeded' })
        .where(eq(adminAudit.id, entry!.id));
      return result;
    } catch (error) {
      await this.database.db
        .update(adminAudit)
        .set({ outcome: 'failed' })
        .where(eq(adminAudit.id, entry!.id));
      throw error;
    }
  }
  async analytics() {
    const db = this.database.db;
    const [accounts] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        deleted: sql<number>`count(*) filter (where deletion_requested_at is not null)::int`,
        completed: sql<number>`count(*) filter (where profile_completed_at is not null)::int`,
        referred: sql<number>`count(*) filter (where referred_by_user_id is not null)::int`,
        new7: sql<number>`count(*) filter (where created_at >= now() - interval '7 days')::int`,
        new30: sql<number>`count(*) filter (where created_at >= now() - interval '30 days')::int`,
      })
      .from(users)
      .where(eq(users.role, 'user'));
    const [water, cycles, plans, recent, growth, referrals] = await Promise.all([
      db
        .select({ records: count(), totalMl: sql<number>`coalesce(sum(amount_ml),0)::float8` })
        .from(waterLogs),
      db.select({ records: count() }).from(cycleEntries),
      db.select({ records: count() }).from(wellnessSettings),
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.role, 'user'))
        .orderBy(desc(users.createdAt))
        .limit(6),
      db
        .select({
          day: sql<string>`to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`,
          accounts: count(),
        })
        .from(users)
        .where(and(eq(users.role, 'user'), sql`created_at >= now() - interval '30 days'`))
        .groupBy(sql`to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`),
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          referralCode: users.referralCode,
          invitations: sql<number>`(select count(*)::int from users invited where invited.referred_by_user_id = ${users.id})`,
        })
        .from(users)
        .where(
          sql`exists (select 1 from users invited where invited.referred_by_user_id = ${users.id})`,
        )
        .orderBy(
          sql`(select count(*) from users invited where invited.referred_by_user_id = ${users.id}) desc`,
        )
        .limit(10),
    ]);
    return {
      accounts,
      tracking: {
        water: water[0],
        cycleEntries: cycles[0]?.records ?? 0,
        configuredAccounts: plans[0]?.records ?? 0,
      },
      recent,
      growth,
      referrals,
    };
  }
  async listUsers(query: unknown) {
    const q = this.parse(
      z.object({
        search: z.string().max(100).default(''),
        page: z.coerce.number().int().min(1).max(100000).default(1),
      }),
      query,
    );
    const search = q.search.replace(/[%_\\]/g, '\\$&');
    const filter = and(
      eq(users.role, 'user'),
      q.search
        ? or(ilike(users.email, `%${search}%`), ilike(users.fullName, `%${search}%`))
        : undefined,
    );
    const rows = await this.database.db
      .select()
      .from(users)
      .where(filter)
      .orderBy(desc(users.createdAt))
      .limit(25)
      .offset((q.page - 1) * 25);
    const [total] = await this.database.db.select({ value: count() }).from(users).where(filter);
    return {
      rows: rows.map((u) => ({
        ...toSafeUser(u),
        deletionRequestedAt: u.deletionRequestedAt,
        recoverableUntil: u.recoverableUntil,
      })),
      total: total?.value ?? 0,
      page: q.page,
    };
  }
  async user(id: string) {
    this.parse(z.uuid(), id);
    const [user] = await this.database.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundException('Account not found');
    return {
      ...toSafeUser(user),
      deletionRequestedAt: user.deletionRequestedAt,
      recoverableUntil: user.recoverableUntil,
      referredByUserId: user.referredByUserId,
      wellness: await this.wellness.snapshot(id),
      recordCounts: {
        water:
          (
            await this.database.db
              .select({ value: count() })
              .from(waterLogs)
              .where(eq(waterLogs.userId, id))
          )[0]?.value ?? 0,
      },
    };
  }
  async createUser(body: unknown) {
    const input = this.parse(
      z
        .object({
          fullName: z.string().trim().min(2).max(100),
          email: z.email().transform((v) => v.toLowerCase()),
          password: z.string().min(12).max(128),
        })
        .strict(),
      body,
    );
    try {
      const [user] = await this.database.db
        .insert(users)
        .values({
          email: input.email,
          fullName: input.fullName,
          passwordHash: await this.passwords.hash(input.password),
        })
        .returning();
      return toSafeUser(user!);
    } catch {
      throw new ConflictException(
        'Account could not be created. Check whether the email is already registered.',
      );
    }
  }
  async updateUser(id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const input = this.parse(
      z
        .object({
          fullName: z.string().trim().min(2).max(100).optional(),
          username: z
            .string()
            .regex(/^[a-z0-9_]{3,30}$/)
            .optional(),
          dateOfBirth: z.string().optional(),
          gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say']).optional(),
          location: z.string().max(100).optional(),
          heightValue: z.number().min(50).max(300).optional(),
          heightUnit: z.enum(['cm', 'in']).optional(),
          weightValue: z.number().min(2).max(500).optional(),
          weightUnit: z.enum(['kg', 'lb']).optional(),
        })
        .strict(),
      body,
    );
    const current = await this.user(id);
    if (current.role === 'super_admin')
      throw new BadRequestException('Seeder-managed administrators cannot be edited here');
    return this.profiles.updateMe(id, input);
  }
  async accountAction(actor: string, id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const { action } = this.parse(
      z
        .object({ action: z.enum(['disable', 'restore', 'delete']), confirm: z.literal(true) })
        .strict(),
      body,
    );
    return this.database.db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, id)).limit(1).for('update');
      if (!user) throw new NotFoundException('Account not found');
      if (id === actor || user.role === 'super_admin')
        throw new BadRequestException('Seeder-managed administrators are protected');
      const now = new Date();
      const [updated] = await tx
        .update(users)
        .set({
          status: action === 'restore' ? 'active' : 'disabled',
          deletionRequestedAt:
            action === 'restore'
              ? null
              : action === 'delete'
                ? (user.deletionRequestedAt ?? now)
                : user.deletionRequestedAt,
          recoverableUntil:
            action === 'restore'
              ? null
              : action === 'delete'
                ? (user.recoverableUntil ?? new Date(now.getTime() + 30 * 86400000))
                : user.recoverableUntil,
          updatedAt: now,
        })
        .where(eq(users.id, id))
        .returning();
      await tx.update(authSessions).set({ revokedAt: now }).where(eq(authSessions.userId, id));
      return toSafeUser(updated!);
    });
  }
  async records(id: string, type: string, page = 1) {
    this.parse(z.uuid(), id);
    this.parse(z.number().int().min(1).max(100000), page);
    if (type === 'water')
      return this.database.db
        .select()
        .from(waterLogs)
        .where(eq(waterLogs.userId, id))
        .orderBy(desc(waterLogs.loggedAt))
        .limit(100)
        .offset((page - 1) * 100);
    if (type === 'cycle')
      return this.database.db
        .select()
        .from(cycleEntries)
        .where(eq(cycleEntries.userId, id))
        .orderBy(desc(cycleEntries.day))
        .limit(100)
        .offset((page - 1) * 100);
    if (type === 'periods')
      return this.database.db
        .select()
        .from(cyclePeriods)
        .where(eq(cyclePeriods.userId, id))
        .orderBy(desc(cyclePeriods.startDate))
        .limit(100)
        .offset((page - 1) * 100);
    throw new BadRequestException('Unknown record type');
  }
  async mutateWellness(id: string, body: unknown) {
    await this.user(id);
    const input = this.parse(
      z
        .object({
          path: z.string().max(150),
          method: z.enum(['PUT', 'DELETE']),
          body: z.unknown().optional(),
          confirm: z.literal(true),
        })
        .strict(),
      body,
    );
    const [area, kind, key] = input.path.split('/');
    if (area === 'activity' && kind === 'goals' && input.method === 'PUT')
      return this.wellness.saveActivityGoals(id, input.body);
    if (area === 'activity' && kind === 'days' && key && input.method === 'PUT')
      return this.wellness.saveActivityDay(id, key, input.body);
    if (area === 'activity' && kind === 'data' && input.method === 'DELETE')
      return this.wellness.clearActivity(id);
    if (area === 'water' && kind === 'plan' && input.method === 'PUT')
      return this.wellness.savePlan(id, input.body);
    if (area === 'water' && kind === 'logs' && key)
      return input.method === 'PUT'
        ? this.wellness.saveLog(id, key, input.body)
        : this.wellness.deleteLog(id, key);
    if (area === 'water' && kind === 'tasks' && key && input.method === 'PUT')
      return this.wellness.saveTask(id, key, input.body);
    if (area === 'water' && kind === 'data' && input.method === 'DELETE')
      return this.wellness.clear(id, 'water');
    if (area === 'medicines' && kind)
      return input.method === 'PUT'
        ? this.wellness.saveMedicine(id, kind, input.body)
        : this.wellness.deleteMedicine(id, kind);
    if (area === 'cycle' && kind === 'settings' && input.method === 'PUT')
      return this.wellness.saveCycleSettings(id, input.body);
    if (area === 'cycle' && kind === 'periods' && key)
      return input.method === 'PUT'
        ? this.wellness.savePeriod(id, key, input.body)
        : this.wellness.deletePeriod(id, key);
    if (area === 'cycle' && kind === 'entries' && key)
      return input.method === 'PUT'
        ? this.wellness.saveEntry(id, key, input.body)
        : this.wellness.deleteEntry(id, key);
    if (area === 'cycle' && kind === 'data' && input.method === 'DELETE')
      return this.wellness.clear(id, 'cycle');
    throw new BadRequestException('This tracking action is not supported');
  }
  async image(id: string) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select({ image: banners.image })
      .from(banners)
      .where(eq(banners.id, id))
      .limit(1);
    if (!row) throw new NotFoundException();
    return row.image;
  }
  async listBanners() {
    return this.database.db
      .select({
        id: banners.id,
        title: banners.title,
        alt: banners.alt,
        route: banners.route,
        published: banners.published,
        sortOrder: banners.sortOrder,
        updatedAt: banners.updatedAt,
      })
      .from(banners)
      .orderBy(banners.sortOrder, desc(banners.createdAt));
  }
  async upload(actor: string, file: Express.Multer.File | undefined, body: unknown) {
    const input = this.parse(
      z
        .object({
          title: z.string().trim().min(1).max(100),
          alt: z.string().trim().min(1).max(240),
          route: routes.optional(),
        })
        .strict(),
      body,
    );
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      throw new BadRequestException('Upload a JPG, PNG or WebP image up to 4 MB');
    let image: Buffer;
    try {
      image = await sharp(file.buffer, { limitInputPixels: 20000000, animated: false })
        .rotate()
        .resize(1600, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Image could not be decoded');
    }
    const [row] = await this.database.db
      .insert(banners)
      .values({ ...input, image, createdBy: actor })
      .returning({ id: banners.id });
    return row;
  }
  async updateBanner(id: string, body: unknown) {
    this.parse(z.uuid(), id);
    const input = this.parse(
      z
        .object({
          title: z.string().trim().min(1).max(100).optional(),
          alt: z.string().trim().min(1).max(240).optional(),
          route: routes.nullable().optional(),
          published: z.boolean().optional(),
          sortOrder: z.number().int().min(0).max(1000).optional(),
        })
        .strict(),
      body,
    );
    const [row] = await this.database.db
      .update(banners)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(banners.id, id))
      .returning({ id: banners.id });
    if (!row) throw new NotFoundException('Banner not found');
    return row;
  }
  async deleteBanner(id: string) {
    this.parse(z.uuid(), id);
    await this.database.db.delete(banners).where(eq(banners.id, id));
    return { deleted: true };
  }
  async auditLog(page = 1) {
    this.parse(z.number().int().min(1).max(100000), page);
    return this.database.db
      .select({
        id: adminAudit.id,
        actorId: adminAudit.actorId,
        targetId: adminAudit.targetId,
        action: adminAudit.action,
        outcome: adminAudit.outcome,
        createdAt: adminAudit.createdAt,
      })
      .from(adminAudit)
      .orderBy(desc(adminAudit.createdAt))
      .limit(50)
      .offset((page - 1) * 50);
  }
}
