"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const sharp_1 = __importDefault(require("sharp"));
const database_service_1 = require("../../database/database.service");
const schema_1 = require("../../database/schema");
const auth_response_dto_1 = require("../auth/dto/auth-response.dto");
const password_service_1 = require("../auth/password.service");
const wellness_service_1 = require("../wellness/wellness.service");
const users_service_1 = require("../users/users.service");
const routes = zod_1.z.enum([
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
let AdminService = class AdminService {
    database;
    passwords;
    wellness;
    profiles;
    constructor(database, passwords, wellness, profiles) {
        this.database = database;
        this.passwords = passwords;
        this.wellness = wellness;
        this.profiles = profiles;
    }
    parse(schema, input) {
        const result = schema.safeParse(input);
        if (!result.success)
            throw new common_1.BadRequestException(result.error.issues.map((i) => i.message).join(' '));
        return result.data;
    }
    async audit(actorId, action, targetId, operation) {
        const [entry] = await this.database.db
            .insert(schema_1.adminAudit)
            .values({ actorId, action, targetId })
            .returning({ id: schema_1.adminAudit.id });
        try {
            const result = await operation();
            await this.database.db
                .update(schema_1.adminAudit)
                .set({ outcome: 'succeeded' })
                .where((0, drizzle_orm_1.eq)(schema_1.adminAudit.id, entry.id));
            return result;
        }
        catch (error) {
            await this.database.db
                .update(schema_1.adminAudit)
                .set({ outcome: 'failed' })
                .where((0, drizzle_orm_1.eq)(schema_1.adminAudit.id, entry.id));
            throw error;
        }
    }
    async analytics() {
        const db = this.database.db;
        const [accounts] = await db
            .select({
            total: (0, drizzle_orm_1.count)(),
            active: (0, drizzle_orm_1.sql) `count(*) filter (where status = 'active')::int`,
            deleted: (0, drizzle_orm_1.sql) `count(*) filter (where deletion_requested_at is not null)::int`,
            completed: (0, drizzle_orm_1.sql) `count(*) filter (where profile_completed_at is not null)::int`,
            referred: (0, drizzle_orm_1.sql) `count(*) filter (where referred_by_user_id is not null)::int`,
            new7: (0, drizzle_orm_1.sql) `count(*) filter (where created_at >= now() - interval '7 days')::int`,
            new30: (0, drizzle_orm_1.sql) `count(*) filter (where created_at >= now() - interval '30 days')::int`,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.role, 'user'));
        const [water, cycles, plans, recent, growth, referrals] = await Promise.all([
            db
                .select({ records: (0, drizzle_orm_1.count)(), totalMl: (0, drizzle_orm_1.sql) `coalesce(sum(amount_ml),0)::float8` })
                .from(schema_1.waterLogs),
            db.select({ records: (0, drizzle_orm_1.count)() }).from(schema_1.cycleEntries),
            db.select({ records: (0, drizzle_orm_1.count)() }).from(schema_1.wellnessSettings),
            db
                .select({
                id: schema_1.users.id,
                fullName: schema_1.users.fullName,
                email: schema_1.users.email,
                createdAt: schema_1.users.createdAt,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.role, 'user'))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))
                .limit(6),
            db
                .select({
                day: (0, drizzle_orm_1.sql) `to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`,
                accounts: (0, drizzle_orm_1.count)(),
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.role, 'user'), (0, drizzle_orm_1.sql) `created_at >= now() - interval '30 days'`))
                .groupBy((0, drizzle_orm_1.sql) `to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`)
                .orderBy((0, drizzle_orm_1.sql) `to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`),
            db
                .select({
                id: schema_1.users.id,
                fullName: schema_1.users.fullName,
                email: schema_1.users.email,
                referralCode: schema_1.users.referralCode,
                invitations: (0, drizzle_orm_1.sql) `(select count(*)::int from users invited where invited.referred_by_user_id = ${schema_1.users.id})`,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.sql) `exists (select 1 from users invited where invited.referred_by_user_id = ${schema_1.users.id})`)
                .orderBy((0, drizzle_orm_1.sql) `(select count(*) from users invited where invited.referred_by_user_id = ${schema_1.users.id}) desc`)
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
    async listUsers(query) {
        const q = this.parse(zod_1.z.object({
            search: zod_1.z.string().max(100).default(''),
            page: zod_1.z.coerce.number().int().min(1).max(100000).default(1),
        }), query);
        const search = q.search.replace(/[%_\\]/g, '\\$&');
        const filter = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.role, 'user'), q.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.users.email, `%${search}%`), (0, drizzle_orm_1.ilike)(schema_1.users.fullName, `%${search}%`))
            : undefined);
        const rows = await this.database.db
            .select()
            .from(schema_1.users)
            .where(filter)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))
            .limit(25)
            .offset((q.page - 1) * 25);
        const [total] = await this.database.db.select({ value: (0, drizzle_orm_1.count)() }).from(schema_1.users).where(filter);
        return {
            rows: rows.map((u) => ({
                ...(0, auth_response_dto_1.toSafeUser)(u),
                deletionRequestedAt: u.deletionRequestedAt,
                recoverableUntil: u.recoverableUntil,
            })),
            total: total?.value ?? 0,
            page: q.page,
        };
    }
    async user(id) {
        this.parse(zod_1.z.uuid(), id);
        const [user] = await this.database.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
        if (!user)
            throw new common_1.NotFoundException('Account not found');
        return {
            ...(0, auth_response_dto_1.toSafeUser)(user),
            deletionRequestedAt: user.deletionRequestedAt,
            recoverableUntil: user.recoverableUntil,
            referredByUserId: user.referredByUserId,
            wellness: await this.wellness.snapshot(id),
            recordCounts: {
                water: (await this.database.db
                    .select({ value: (0, drizzle_orm_1.count)() })
                    .from(schema_1.waterLogs)
                    .where((0, drizzle_orm_1.eq)(schema_1.waterLogs.userId, id)))[0]?.value ?? 0,
            },
        };
    }
    async createUser(body) {
        const input = this.parse(zod_1.z
            .object({
            fullName: zod_1.z.string().trim().min(2).max(100),
            email: zod_1.z.email().transform((v) => v.toLowerCase()),
            password: zod_1.z.string().min(12).max(128),
        })
            .strict(), body);
        try {
            const [user] = await this.database.db
                .insert(schema_1.users)
                .values({
                email: input.email,
                fullName: input.fullName,
                passwordHash: await this.passwords.hash(input.password),
            })
                .returning();
            return (0, auth_response_dto_1.toSafeUser)(user);
        }
        catch {
            throw new common_1.ConflictException('Account could not be created. Check whether the email is already registered.');
        }
    }
    async updateUser(id, body) {
        this.parse(zod_1.z.uuid(), id);
        const input = this.parse(zod_1.z
            .object({
            fullName: zod_1.z.string().trim().min(2).max(100).optional(),
            username: zod_1.z
                .string()
                .regex(/^[a-z0-9_]{3,30}$/)
                .optional(),
            dateOfBirth: zod_1.z.string().optional(),
            gender: zod_1.z.enum(['female', 'male', 'other', 'prefer_not_to_say']).optional(),
            location: zod_1.z.string().max(100).optional(),
            heightValue: zod_1.z.number().min(50).max(300).optional(),
            heightUnit: zod_1.z.enum(['cm', 'in']).optional(),
            weightValue: zod_1.z.number().min(2).max(500).optional(),
            weightUnit: zod_1.z.enum(['kg', 'lb']).optional(),
        })
            .strict(), body);
        const current = await this.user(id);
        if (current.role === 'super_admin')
            throw new common_1.BadRequestException('Seeder-managed administrators cannot be edited here');
        return this.profiles.updateMe(id, input);
    }
    async accountAction(actor, id, body) {
        this.parse(zod_1.z.uuid(), id);
        const { action } = this.parse(zod_1.z
            .object({ action: zod_1.z.enum(['disable', 'restore', 'delete']), confirm: zod_1.z.literal(true) })
            .strict(), body);
        return this.database.db.transaction(async (tx) => {
            const [user] = await tx.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1).for('update');
            if (!user)
                throw new common_1.NotFoundException('Account not found');
            if (id === actor || user.role === 'super_admin')
                throw new common_1.BadRequestException('Seeder-managed administrators are protected');
            const now = new Date();
            const [updated] = await tx
                .update(schema_1.users)
                .set({
                status: action === 'restore' ? 'active' : 'disabled',
                deletionRequestedAt: action === 'restore'
                    ? null
                    : action === 'delete'
                        ? (user.deletionRequestedAt ?? now)
                        : user.deletionRequestedAt,
                recoverableUntil: action === 'restore'
                    ? null
                    : action === 'delete'
                        ? (user.recoverableUntil ?? new Date(now.getTime() + 30 * 86400000))
                        : user.recoverableUntil,
                updatedAt: now,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
                .returning();
            await tx.update(schema_1.authSessions).set({ revokedAt: now }).where((0, drizzle_orm_1.eq)(schema_1.authSessions.userId, id));
            return (0, auth_response_dto_1.toSafeUser)(updated);
        });
    }
    async records(id, type, page = 1) {
        this.parse(zod_1.z.uuid(), id);
        this.parse(zod_1.z.number().int().min(1).max(100000), page);
        if (type === 'water')
            return this.database.db
                .select()
                .from(schema_1.waterLogs)
                .where((0, drizzle_orm_1.eq)(schema_1.waterLogs.userId, id))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.waterLogs.loggedAt))
                .limit(100)
                .offset((page - 1) * 100);
        if (type === 'cycle')
            return this.database.db
                .select()
                .from(schema_1.cycleEntries)
                .where((0, drizzle_orm_1.eq)(schema_1.cycleEntries.userId, id))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.cycleEntries.day))
                .limit(100)
                .offset((page - 1) * 100);
        if (type === 'periods')
            return this.database.db
                .select()
                .from(schema_1.cyclePeriods)
                .where((0, drizzle_orm_1.eq)(schema_1.cyclePeriods.userId, id))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.cyclePeriods.startDate))
                .limit(100)
                .offset((page - 1) * 100);
        throw new common_1.BadRequestException('Unknown record type');
    }
    async mutateWellness(id, body) {
        await this.user(id);
        const input = this.parse(zod_1.z
            .object({
            path: zod_1.z.string().max(150),
            method: zod_1.z.enum(['PUT', 'DELETE']),
            body: zod_1.z.unknown().optional(),
            confirm: zod_1.z.literal(true),
        })
            .strict(), body);
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
        throw new common_1.BadRequestException('This tracking action is not supported');
    }
    async image(id) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select({ image: schema_1.banners.image })
            .from(schema_1.banners)
            .where((0, drizzle_orm_1.eq)(schema_1.banners.id, id))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException();
        return row.image;
    }
    async listBanners() {
        return this.database.db
            .select({
            id: schema_1.banners.id,
            title: schema_1.banners.title,
            alt: schema_1.banners.alt,
            route: schema_1.banners.route,
            published: schema_1.banners.published,
            sortOrder: schema_1.banners.sortOrder,
            updatedAt: schema_1.banners.updatedAt,
        })
            .from(schema_1.banners)
            .orderBy(schema_1.banners.sortOrder, (0, drizzle_orm_1.desc)(schema_1.banners.createdAt));
    }
    async upload(actor, file, body) {
        const input = this.parse(zod_1.z
            .object({
            title: zod_1.z.string().trim().min(1).max(100),
            alt: zod_1.z.string().trim().min(1).max(240),
            route: routes.optional(),
        })
            .strict(), body);
        if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
            throw new common_1.BadRequestException('Upload a JPG, PNG or WebP image up to 4 MB');
        let image;
        try {
            image = await (0, sharp_1.default)(file.buffer, { limitInputPixels: 20000000, animated: false })
                .rotate()
                .resize(1600, 800, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 88 })
                .toBuffer();
        }
        catch {
            throw new common_1.BadRequestException('Image could not be decoded');
        }
        const [row] = await this.database.db
            .insert(schema_1.banners)
            .values({ ...input, image, createdBy: actor })
            .returning({ id: schema_1.banners.id });
        return row;
    }
    async updateBanner(id, body) {
        this.parse(zod_1.z.uuid(), id);
        const input = this.parse(zod_1.z
            .object({
            title: zod_1.z.string().trim().min(1).max(100).optional(),
            alt: zod_1.z.string().trim().min(1).max(240).optional(),
            route: routes.nullable().optional(),
            published: zod_1.z.boolean().optional(),
            sortOrder: zod_1.z.number().int().min(0).max(1000).optional(),
        })
            .strict(), body);
        const [row] = await this.database.db
            .update(schema_1.banners)
            .set({ ...input, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.banners.id, id))
            .returning({ id: schema_1.banners.id });
        if (!row)
            throw new common_1.NotFoundException('Banner not found');
        return row;
    }
    async deleteBanner(id) {
        this.parse(zod_1.z.uuid(), id);
        await this.database.db.delete(schema_1.banners).where((0, drizzle_orm_1.eq)(schema_1.banners.id, id));
        return { deleted: true };
    }
    async auditLog(page = 1) {
        this.parse(zod_1.z.number().int().min(1).max(100000), page);
        return this.database.db
            .select({
            id: schema_1.adminAudit.id,
            actorId: schema_1.adminAudit.actorId,
            targetId: schema_1.adminAudit.targetId,
            action: schema_1.adminAudit.action,
            outcome: schema_1.adminAudit.outcome,
            createdAt: schema_1.adminAudit.createdAt,
        })
            .from(schema_1.adminAudit)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.adminAudit.createdAt))
            .limit(50)
            .offset((page - 1) * 50);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        password_service_1.PasswordService,
        wellness_service_1.WellnessService,
        users_service_1.UsersService])
], AdminService);
//# sourceMappingURL=admin.service.js.map