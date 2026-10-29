"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellnessService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../database/database.service");
const schema_1 = require("../../database/schema");
const domain_1 = require("./domain");
const input = __importStar(require("./wellness.input"));
let WellnessService = class WellnessService {
    database;
    constructor(database) {
        this.database = database;
    }
    parse(schema, body) {
        const result = schema.safeParse(body);
        if (!result.success)
            throw new common_1.BadRequestException(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' '));
        return result.data;
    }
    uuid(id) {
        return this.parse(zod_1.z.uuid(), id);
    }
    async mutate(userId, operation) {
        await this.database.db.transaction(async (tx) => {
            await tx.select({ id: schema_1.users.id }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).for('update');
            await operation(tx);
        });
        return this.snapshot(userId);
    }
    async snapshot(userId) {
        const db = this.database.db, cutoff = (0, domain_1.addDays)((0, domain_1.localDay)(new Date(), domain_1.APP_TIMEZONE), -90);
        const [preferences, water, states, history, daily] = await Promise.all([
            db.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId)),
            db
                .select()
                .from(schema_1.waterLogs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waterLogs.userId, userId), (0, drizzle_orm_1.gte)(schema_1.waterLogs.day, cutoff)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.waterLogs.loggedAt))
                .limit(3000),
            db
                .select()
                .from(schema_1.waterTaskStates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waterTaskStates.userId, userId), (0, drizzle_orm_1.gte)(schema_1.waterTaskStates.day, cutoff))),
            db.select().from(schema_1.cyclePeriods).where((0, drizzle_orm_1.eq)(schema_1.cyclePeriods.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.cyclePeriods.startDate)),
            db
                .select()
                .from(schema_1.cycleEntries)
                .where((0, drizzle_orm_1.eq)(schema_1.cycleEntries.userId, userId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.cycleEntries.day))
                .limit(730),
        ]);
        return {
            activityTracking: preferences[0]?.activityTracking ?? { goals: {}, days: [] },
            medicines: preferences[0]?.medicines ?? [],
            waterPlan: preferences[0]?.waterPlan
                ? { ...preferences[0].waterPlan, timezone: domain_1.APP_TIMEZONE }
                : null,
            cycleSettings: preferences[0]?.cycleSettings
                ? { ...preferences[0].cycleSettings, timezone: domain_1.APP_TIMEZONE }
                : null,
            waterLogs: water.map((row) => ({
                id: row.id,
                amountMl: row.amountMl,
                loggedAt: row.loggedAt.toISOString(),
                day: row.day,
                targetMl: row.targetMl,
                taskId: row.taskId,
            })),
            waterTasks: states.map((row) => ({
                taskId: row.taskId,
                day: row.day,
                status: row.status,
                snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
            })),
            periods: history.map((row) => ({
                id: row.id,
                startDate: row.startDate,
                endDate: row.endDate,
            })),
            cycleEntries: daily.map((row) => ({
                day: row.day,
                flow: row.flow,
                symptoms: row.symptoms,
                mood: row.mood,
                notes: row.notes,
            })),
        };
    }
    saveActivityGoals(userId, body) {
        const { goals } = this.parse(input.activityGoalsInput, body);
        return this.mutate(userId, async (tx) => {
            const [row] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            const current = row?.activityTracking ?? { goals: {}, days: [] };
            const merged = { ...current.goals };
            for (const key of Object.keys(goals)) {
                const value = goals[key];
                if (value == null)
                    delete merged[key];
                else
                    merged[key] = value;
            }
            const activityTracking = { ...current, goals: merged };
            await tx
                .insert(schema_1.wellnessSettings)
                .values({ userId, activityTracking })
                .onConflictDoUpdate({
                target: schema_1.wellnessSettings.userId,
                set: { activityTracking, updatedAt: new Date() },
            });
        });
    }
    saveActivityDay(userId, day, body) {
        this.parse(zod_1.z.string().refine(domain_1.validDay), day);
        const today = (0, domain_1.localDay)(new Date(), domain_1.APP_TIMEZONE);
        if (day > today || day < (0, domain_1.addDays)(today, -89))
            throw new common_1.BadRequestException('Record activity within the last 90 days, through today.');
        const { values } = this.parse(input.activityDayInput, body);
        return this.mutate(userId, async (tx) => {
            const [row] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            const current = row?.activityTracking ?? { goals: {}, days: [] };
            const merged = { ...current.days.find((entry) => entry.day === day)?.values };
            for (const key of Object.keys(values)) {
                const value = values[key];
                if (value == null)
                    delete merged[key];
                else
                    merged[key] = value;
            }
            const days = [
                ...current.days.filter((entry) => entry.day !== day && entry.day >= (0, domain_1.addDays)(today, -89)),
                ...(Object.keys(merged).length ? [{ day, values: merged }] : []),
            ]
                .sort((a, b) => b.day.localeCompare(a.day))
                .slice(0, 90);
            const activityTracking = { ...current, days };
            await tx
                .insert(schema_1.wellnessSettings)
                .values({ userId, activityTracking })
                .onConflictDoUpdate({
                target: schema_1.wellnessSettings.userId,
                set: { activityTracking, updatedAt: new Date() },
            });
        });
    }
    clearActivity(userId) {
        return this.mutate(userId, async (tx) => {
            await tx
                .update(schema_1.wellnessSettings)
                .set({ activityTracking: { goals: {}, days: [] }, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
        });
    }
    saveMedicine(userId, id, body) {
        this.uuid(id);
        const medicine = this.parse(input.medicineInput, body);
        return this.mutate(userId, async (tx) => {
            const [row] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            const current = row?.medicines ?? [];
            if (current.length >= 30 && !current.some((m) => m.id === id))
                throw new common_1.BadRequestException('You can save up to 30 medicines.');
            const medicines = [...current.filter((m) => m.id !== id), { id, ...medicine }];
            await tx
                .insert(schema_1.wellnessSettings)
                .values({ userId, medicines })
                .onConflictDoUpdate({ target: schema_1.wellnessSettings.userId, set: { medicines, updatedAt: new Date() } });
        });
    }
    deleteMedicine(userId, id) {
        this.uuid(id);
        return this.mutate(userId, async (tx) => {
            const [row] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            await tx
                .update(schema_1.wellnessSettings)
                .set({
                medicines: (row?.medicines ?? []).filter((m) => m.id !== id),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
        });
    }
    savePlan(userId, body) {
        const plan = this.parse(input.planInput, body);
        if (plan.pausedUntil && Date.parse(plan.pausedUntil) > Date.now() + 32 * 86400000)
            throw new common_1.BadRequestException('Pause for up to 31 days, or turn reminders off.');
        return this.mutate(userId, async (tx) => {
            const [current] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            const old = current?.waterPlan;
            const same = old &&
                ['wakeTime', 'sleepTime', 'targetMl', 'servingMl', 'timezone'].every((key) => old[key] === plan[key]);
            const waterPlan = { ...plan, version: same ? old.version : (0, node_crypto_1.randomUUID)() };
            await tx
                .insert(schema_1.wellnessSettings)
                .values({ userId, waterPlan })
                .onConflictDoUpdate({ target: schema_1.wellnessSettings.userId, set: { waterPlan, updatedAt: new Date() } });
        });
    }
    saveLog(userId, id, body) {
        this.uuid(id);
        const log = this.parse(input.logInput, body), now = new Date(), at = new Date(log.loggedAt);
        if (at.getTime() > now.getTime() + 60000 || at.getTime() < now.getTime() - 7 * 86400000)
            throw new common_1.BadRequestException('Log water within the last seven days.');
        return this.mutate(userId, async (tx) => {
            const [existing] = await tx.select().from(schema_1.waterLogs).where((0, drizzle_orm_1.eq)(schema_1.waterLogs.id, id));
            if (existing) {
                if (existing.userId !== userId ||
                    existing.amountMl !== log.amountMl ||
                    existing.loggedAt.getTime() !== at.getTime() ||
                    existing.taskId !== log.taskId)
                    throw new common_1.ConflictException('This log ID is already in use. Refresh before trying again.');
                return;
            }
            const [row] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            const plan = row?.waterPlan;
            if (!plan)
                throw new common_1.BadRequestException('Set up your water plan first.');
            const day = (0, domain_1.waterDay)(plan, at);
            if (log.taskId) {
                const currentLogs = await tx
                    .select()
                    .from(schema_1.waterLogs)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waterLogs.userId, userId), (0, drizzle_orm_1.eq)(schema_1.waterLogs.day, day)));
                const task = (0, domain_1.waterSchedule)(plan, day, currentLogs.map((row) => ({ ...row, loggedAt: row.loggedAt.toISOString() }))).find((t) => t.id === log.taskId);
                if (!task)
                    throw new common_1.BadRequestException('This drinking task has changed. Refresh your plan.');
                const [already] = await tx
                    .select()
                    .from(schema_1.waterLogs)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waterLogs.userId, userId), (0, drizzle_orm_1.eq)(schema_1.waterLogs.taskId, log.taskId)));
                if (already)
                    return;
                if (log.amountMl !== task.remainingMl || task.remainingMl === 0)
                    throw new common_1.ConflictException('This task has changed. Reload tracking before logging it.');
            }
            await tx
                .insert(schema_1.waterLogs)
                .values({ id, userId, ...log, loggedAt: at, day, targetMl: plan.targetMl });
        });
    }
    deleteLog(userId, id) {
        this.uuid(id);
        return this.mutate(userId, async (tx) => {
            await tx.delete(schema_1.waterLogs).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waterLogs.userId, userId), (0, drizzle_orm_1.eq)(schema_1.waterLogs.id, id)));
        });
    }
    saveTask(userId, taskId, body) {
        const state = this.parse(input.taskInput, body);
        return this.mutate(userId, async (tx) => {
            const [row] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            const plan = row?.waterPlan;
            if (!plan ||
                state.day !== (0, domain_1.waterDay)(plan) ||
                !(0, domain_1.waterSchedule)(plan, state.day).some((task) => task.id === taskId))
                throw new common_1.BadRequestException('This task has changed. Refresh your plan.');
            if (state.snoozedUntil &&
                (Date.parse(state.snoozedUntil) <= Date.now() ||
                    Date.parse(state.snoozedUntil) < (0, domain_1.waterWindow)(plan, state.day).start.getTime() ||
                    Date.parse(state.snoozedUntil) >= (0, domain_1.waterWindow)(plan, state.day).end.getTime()))
                throw new common_1.BadRequestException('Choose a snooze time before bedtime.');
            const values = {
                userId,
                taskId,
                ...state,
                snoozedUntil: state.snoozedUntil ? new Date(state.snoozedUntil) : null,
            };
            await tx
                .insert(schema_1.waterTaskStates)
                .values(values)
                .onConflictDoUpdate({ target: [schema_1.waterTaskStates.userId, schema_1.waterTaskStates.taskId], set: values });
        });
    }
    saveCycleSettings(userId, body) {
        const cycleSettings = this.parse(input.cycleInput, body);
        return this.mutate(userId, async (tx) => {
            await tx
                .insert(schema_1.wellnessSettings)
                .values({ userId, cycleSettings })
                .onConflictDoUpdate({
                target: schema_1.wellnessSettings.userId,
                set: { cycleSettings, updatedAt: new Date() },
            });
        });
    }
    savePeriod(userId, id, body) {
        this.uuid(id);
        const period = this.parse(input.periodInput, body);
        return this.mutate(userId, async (tx) => {
            const [preferences] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            if (!preferences?.cycleSettings)
                throw new common_1.BadRequestException('Set up cycle tracking first.');
            const today = (0, domain_1.localDay)(new Date(), domain_1.APP_TIMEZONE);
            if (period.startDate > today ||
                (period.endDate && (period.endDate < period.startDate || period.endDate > today)))
                throw new common_1.BadRequestException('Recorded dates must be in the past or today, with the end after the start.');
            const [existing] = await tx.select().from(schema_1.cyclePeriods).where((0, drizzle_orm_1.eq)(schema_1.cyclePeriods.id, id));
            if (existing && existing.userId !== userId)
                throw new common_1.NotFoundException();
            const all = await tx.select().from(schema_1.cyclePeriods).where((0, drizzle_orm_1.eq)(schema_1.cyclePeriods.userId, userId));
            if (all.some((p) => p.id !== id &&
                p.startDate <= (period.endDate ?? '9999-12-31') &&
                period.startDate <= (p.endDate ?? '9999-12-31')))
                throw new common_1.ConflictException('These dates overlap another period. End or edit that record first.');
            if (existing) {
                await tx
                    .update(schema_1.cyclePeriods)
                    .set(period)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cyclePeriods.id, id), (0, drizzle_orm_1.eq)(schema_1.cyclePeriods.userId, userId)));
            }
            else {
                const inserted = await tx
                    .insert(schema_1.cyclePeriods)
                    .values({ id, userId, ...period })
                    .onConflictDoNothing()
                    .returning({ id: schema_1.cyclePeriods.id });
                if (!inserted.length)
                    throw new common_1.ConflictException('This record ID is already in use. Reload tracking before trying again.');
            }
        });
    }
    deletePeriod(userId, id) {
        this.uuid(id);
        return this.mutate(userId, async (tx) => {
            await tx.delete(schema_1.cyclePeriods).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cyclePeriods.userId, userId), (0, drizzle_orm_1.eq)(schema_1.cyclePeriods.id, id)));
        });
    }
    saveEntry(userId, day, body) {
        this.parse(zod_1.z
            .string()
            .refine((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) &&
            Number.isFinite(Date.parse(d)) &&
            new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) === d), day);
        const entry = this.parse(input.entryInput, body);
        return this.mutate(userId, async (tx) => {
            const [row] = await tx.select().from(schema_1.wellnessSettings).where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            if (!row?.cycleSettings || day > (0, domain_1.localDay)(new Date(), domain_1.APP_TIMEZONE))
                throw new common_1.BadRequestException('Choose today or an earlier date.');
            await tx
                .insert(schema_1.cycleEntries)
                .values({ userId, day, ...entry })
                .onConflictDoUpdate({ target: [schema_1.cycleEntries.userId, schema_1.cycleEntries.day], set: entry });
        });
    }
    deleteEntry(userId, day) {
        this.parse(zod_1.z.string().refine(domain_1.validDay), day);
        return this.mutate(userId, async (tx) => {
            await tx.delete(schema_1.cycleEntries).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cycleEntries.userId, userId), (0, drizzle_orm_1.eq)(schema_1.cycleEntries.day, day)));
        });
    }
    clear(userId, feature) {
        return this.mutate(userId, async (tx) => {
            if (feature === 'water') {
                await tx.delete(schema_1.waterLogs).where((0, drizzle_orm_1.eq)(schema_1.waterLogs.userId, userId));
                await tx.delete(schema_1.waterTaskStates).where((0, drizzle_orm_1.eq)(schema_1.waterTaskStates.userId, userId));
                await tx
                    .update(schema_1.wellnessSettings)
                    .set({ waterPlan: null, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            }
            else {
                await tx.delete(schema_1.cyclePeriods).where((0, drizzle_orm_1.eq)(schema_1.cyclePeriods.userId, userId));
                await tx.delete(schema_1.cycleEntries).where((0, drizzle_orm_1.eq)(schema_1.cycleEntries.userId, userId));
                await tx
                    .update(schema_1.wellnessSettings)
                    .set({ cycleSettings: null, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId));
            }
        });
    }
};
exports.WellnessService = WellnessService;
exports.WellnessService = WellnessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], WellnessService);
//# sourceMappingURL=wellness.service.js.map