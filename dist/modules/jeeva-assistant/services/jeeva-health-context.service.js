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
exports.JeevaHealthContextService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const personal_wellness_domain_1 = require("../../personal-wellness/domain/personal-wellness.domain");
function text(value, max = 80) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}
function number(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function metrics(value) {
    return Object.fromEntries(personal_wellness_domain_1.activityMetricKeys.flatMap((key) => (number(value[key]) == null ? [] : [[key, value[key]]])));
}
let JeevaHealthContextService = class JeevaHealthContextService {
    database;
    constructor(database) {
        this.database = database;
    }
    async forUser(userId, now = new Date()) {
        const today = (0, personal_wellness_domain_1.localDay)(now, personal_wellness_domain_1.APP_TIMEZONE), cutoff = (0, personal_wellness_domain_1.addDays)(today, -6), db = this.database.db;
        const [profile, settings, water, periods, entries] = await Promise.all([
            db
                .select({ heightCm: schema_1.userAccounts.heightCm, weightKg: schema_1.userAccounts.weightKg, setup: schema_1.userAccounts.profileSetup })
                .from(schema_1.userAccounts)
                .where((0, drizzle_orm_1.eq)(schema_1.userAccounts.id, userId))
                .limit(1),
            db
                .select({
                activity: schema_1.personalWellnessSettings.activityTracking,
                water: schema_1.personalWellnessSettings.waterPlan,
                medicines: schema_1.personalWellnessSettings.medicines,
                cycle: schema_1.personalWellnessSettings.cycleSettings,
                updatedAt: schema_1.personalWellnessSettings.updatedAt,
            })
                .from(schema_1.personalWellnessSettings)
                .where((0, drizzle_orm_1.eq)(schema_1.personalWellnessSettings.userId, userId))
                .limit(1),
            db
                .select({
                day: schema_1.waterIntakeLogs.day,
                loggedMl: (0, drizzle_orm_1.sql) `sum(${schema_1.waterIntakeLogs.amountMl})`.mapWith(Number),
            })
                .from(schema_1.waterIntakeLogs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waterIntakeLogs.userId, userId), (0, drizzle_orm_1.gte)(schema_1.waterIntakeLogs.day, cutoff), (0, drizzle_orm_1.lte)(schema_1.waterIntakeLogs.day, today)))
                .groupBy(schema_1.waterIntakeLogs.day)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.waterIntakeLogs.day))
                .limit(7),
            db
                .select({ startDate: schema_1.menstrualPeriods.startDate, endDate: schema_1.menstrualPeriods.endDate })
                .from(schema_1.menstrualPeriods)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menstrualPeriods.userId, userId), (0, drizzle_orm_1.lte)(schema_1.menstrualPeriods.startDate, today)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.menstrualPeriods.startDate))
                .limit(3),
            db
                .select({
                day: schema_1.menstrualDailyLogs.day,
                flow: schema_1.menstrualDailyLogs.flow,
                symptoms: schema_1.menstrualDailyLogs.symptoms,
                mood: schema_1.menstrualDailyLogs.mood,
            })
                .from(schema_1.menstrualDailyLogs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menstrualDailyLogs.userId, userId), (0, drizzle_orm_1.gte)(schema_1.menstrualDailyLogs.day, cutoff), (0, drizzle_orm_1.lte)(schema_1.menstrualDailyLogs.day, today)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.menstrualDailyLogs.day))
                .limit(7),
        ]);
        const p = profile[0], setup = p?.setup ?? {}, saved = settings[0];
        const dob = text(setup.dateOfBirth), birth = dob && (0, personal_wellness_domain_1.validDay)(dob) && dob <= today ? dob : null;
        const age = birth
            ? Number(today.slice(0, 4)) -
                Number(birth.slice(0, 4)) -
                (today.slice(5) < birth.slice(5) ? 1 : 0)
            : null;
        const medicines = saved?.medicines ?? [];
        return {
            asOf: now.toISOString(),
            timezone: personal_wellness_domain_1.APP_TIMEZONE,
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
                    .filter((day) => (0, personal_wellness_domain_1.validDay)(day.day) && day.day >= cutoff && day.day <= today)
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
exports.JeevaHealthContextService = JeevaHealthContextService;
exports.JeevaHealthContextService = JeevaHealthContextService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], JeevaHealthContextService);
//# sourceMappingURL=jeeva-health-context.service.js.map