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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatContextService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_service_1 = require("../../database/database.service");
const schema_1 = require("../../database/schema");
const domain_1 = require("../wellness/domain");
function text(value, max = 80) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}
function number(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function metrics(value) {
    return Object.fromEntries(domain_1.activityMetricKeys.flatMap((key) => (number(value[key]) == null ? [] : [[key, value[key]]])));
}
let ChatContextService = class ChatContextService {
    database;
    constructor(database) {
        this.database = database;
    }
    async forUser(userId, now = new Date()) {
        const today = (0, domain_1.localDay)(now, domain_1.APP_TIMEZONE), cutoff = (0, domain_1.addDays)(today, -6), db = this.database.db;
        const [profile, settings, water, periods, entries] = await Promise.all([
            db
                .select({ heightCm: schema_1.users.heightCm, weightKg: schema_1.users.weightKg, setup: schema_1.users.profileSetup })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                .limit(1),
            db
                .select({
                activity: schema_1.wellnessSettings.activityTracking,
                water: schema_1.wellnessSettings.waterPlan,
                medicines: schema_1.wellnessSettings.medicines,
                cycle: schema_1.wellnessSettings.cycleSettings,
                updatedAt: schema_1.wellnessSettings.updatedAt,
            })
                .from(schema_1.wellnessSettings)
                .where((0, drizzle_orm_1.eq)(schema_1.wellnessSettings.userId, userId))
                .limit(1),
            db
                .select({
                day: schema_1.waterLogs.day,
                loggedMl: (0, drizzle_orm_1.sql) `sum(${schema_1.waterLogs.amountMl})`.mapWith(Number),
            })
                .from(schema_1.waterLogs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waterLogs.userId, userId), (0, drizzle_orm_1.gte)(schema_1.waterLogs.day, cutoff), (0, drizzle_orm_1.lte)(schema_1.waterLogs.day, today)))
                .groupBy(schema_1.waterLogs.day)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.waterLogs.day))
                .limit(7),
            db
                .select({ startDate: schema_1.cyclePeriods.startDate, endDate: schema_1.cyclePeriods.endDate })
                .from(schema_1.cyclePeriods)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cyclePeriods.userId, userId), (0, drizzle_orm_1.lte)(schema_1.cyclePeriods.startDate, today)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.cyclePeriods.startDate))
                .limit(3),
            db
                .select({
                day: schema_1.cycleEntries.day,
                flow: schema_1.cycleEntries.flow,
                symptoms: schema_1.cycleEntries.symptoms,
                mood: schema_1.cycleEntries.mood,
            })
                .from(schema_1.cycleEntries)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cycleEntries.userId, userId), (0, drizzle_orm_1.gte)(schema_1.cycleEntries.day, cutoff), (0, drizzle_orm_1.lte)(schema_1.cycleEntries.day, today)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.cycleEntries.day))
                .limit(7),
        ]);
        const p = profile[0], setup = p?.setup ?? {}, saved = settings[0];
        const dob = text(setup.dateOfBirth), birth = dob && (0, domain_1.validDay)(dob) && dob <= today ? dob : null;
        const age = birth
            ? Number(today.slice(0, 4)) -
                Number(birth.slice(0, 4)) -
                (today.slice(5) < birth.slice(5) ? 1 : 0)
            : null;
        const medicines = saved?.medicines ?? [];
        return {
            asOf: now.toISOString(),
            timezone: domain_1.APP_TIMEZONE,
            range: { from: cutoff, through: today },
            source: 'User-entered, backend-saved records; not clinically verified. Missing entries are unknown, not zero.',
            profile: {
                ageYears: age != null && age >= 0 && age <= 120 ? age : null,
                heightCm: number(p?.heightCm),
                weightKg: number(p?.weightKg),
                activityLevel: text(setup.activityLevel),
                healthGoals: Array.isArray(setup.healthGoals)
                    ? setup.healthGoals.flatMap((value) => (text(value) ? [text(value)] : [])).slice(0, 10)
                    : [],
            },
            activity: {
                goals: metrics(saved?.activity.goals ?? {}),
                days: (saved?.activity.days ?? [])
                    .filter((day) => (0, domain_1.validDay)(day.day) && day.day >= cutoff && day.day <= today)
                    .sort((a, b) => b.day.localeCompare(a.day))
                    .slice(0, 7)
                    .map((day) => ({ day: day.day, values: metrics(day.values) })),
            },
            water: { targetMl: saved?.water?.targetMl ?? null, loggedDailyTotals: water },
            medicines: {
                totalSaved: medicines.length,
                entries: medicines
                    .slice(0, 20)
                    .map((medicine) => ({
                    name: text(medicine.name),
                    remindersEnabled: medicine.enabled,
                    scheduledDoses: medicine.doses
                        .slice(0, 4)
                        .map((dose) => ({ time: text(dose.time, 5), amount: text(dose.amount, 40) })),
                })),
                note: 'These are saved schedules, not evidence of prescriptions, doses taken or adherence.',
            },
            cycle: {
                recordedCycleLength: saved?.cycle?.cycleLength ?? null,
                recordedPeriodLength: saved?.cycle?.periodLength ?? null,
                recentPeriods: periods,
                recentCheckIns: entries.map((entry) => ({
                    ...entry,
                    symptoms: entry.symptoms.slice(0, 8).map((value) => text(value, 30)),
                    mood: text(entry.mood, 30),
                })),
            },
            unavailable: [
                'Phone sensor totals and Health Connect readings stored only on the device',
                'Medical documents not stored by the daily-care backend',
            ],
        };
    }
};
exports.ChatContextService = ChatContextService;
exports.ChatContextService = ChatContextService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ChatContextService);
//# sourceMappingURL=chat-context.service.js.map