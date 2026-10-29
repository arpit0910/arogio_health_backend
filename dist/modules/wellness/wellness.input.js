"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityDayInput = exports.activityGoalsInput = exports.medicineInput = exports.entryInput = exports.periodInput = exports.taskInput = exports.logInput = exports.cycleInput = exports.planInput = void 0;
const zod_1 = require("zod");
const domain_1 = require("./domain");
const clock = zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const day = zod_1.z.string().refine(domain_1.validDay, 'Use a valid calendar date.');
const timezone = zod_1.z
    .string()
    .refine(domain_1.validTimezone, 'Choose a valid timezone.')
    .transform(() => domain_1.APP_TIMEZONE);
exports.planInput = zod_1.z
    .object({
    wakeTime: clock,
    sleepTime: clock,
    targetMl: zod_1.z.number().int().min(100).max(6000),
    servingMl: zod_1.z.number().int().min(50).max(1000),
    timezone,
    remindersEnabled: zod_1.z.boolean(),
    pausedUntil: zod_1.z.iso.datetime().nullable(),
})
    .strict()
    .refine((p) => (0, domain_1.awakeMinutes)(p) >= 120 && (0, domain_1.awakeMinutes)(p) <= 1320, 'Waking hours must be between 2 and 22 hours.');
exports.cycleInput = zod_1.z
    .object({
    cycleLength: zod_1.z.number().int().min(10).max(120),
    periodLength: zod_1.z.number().int().min(1).max(30),
    predictionsEnabled: zod_1.z.boolean(),
    remindersEnabled: zod_1.z.boolean(),
    discreet: zod_1.z.boolean(),
    reminderDaysBefore: zod_1.z.number().int().min(0).max(7),
    reminderTime: clock,
    timezone,
})
    .strict();
exports.logInput = zod_1.z
    .object({
    amountMl: zod_1.z.number().int().min(1).max(3000),
    loggedAt: zod_1.z.iso.datetime(),
    taskId: zod_1.z.string().max(100).nullable().default(null),
})
    .strict();
exports.taskInput = zod_1.z
    .object({
    day,
    status: zod_1.z.enum(['pending', 'skipped']),
    snoozedUntil: zod_1.z.iso.datetime().nullable(),
})
    .strict();
exports.periodInput = zod_1.z.object({ startDate: day, endDate: day.nullable() }).strict();
exports.entryInput = zod_1.z
    .object({
    flow: zod_1.z.enum(domain_1.flows),
    symptoms: zod_1.z
        .array(zod_1.z.enum(domain_1.symptoms))
        .max(8)
        .refine((a) => new Set(a).size === a.length),
    mood: zod_1.z.enum(domain_1.moods).nullable(),
    notes: zod_1.z.string().max(1000),
})
    .strict();
exports.medicineInput = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(80),
    notes: zod_1.z.string().trim().max(1000),
    enabled: zod_1.z.boolean(),
    doses: zod_1.z
        .array(zod_1.z.object({ time: clock, amount: zod_1.z.string().trim().min(1).max(80) }).strict())
        .min(1)
        .max(12)
        .refine((doses) => new Set(doses.map((d) => d.time)).size === doses.length, 'Choose a different time for each dose.'),
})
    .strict();
const activityValues = zod_1.z
    .object({
    Steps: zod_1.z.number().int().min(0).max(200000).nullable().optional(),
    ActiveCaloriesBurned: zod_1.z.number().min(0).max(20000).nullable().optional(),
    Distance: zod_1.z.number().min(0).max(500).nullable().optional(),
    ExerciseSession: zod_1.z.number().min(0).max(1440).nullable().optional(),
    SleepSession: zod_1.z.number().min(0).max(24).nullable().optional(),
    Nutrition: zod_1.z.number().min(0).max(20000).nullable().optional(),
})
    .strict();
exports.activityGoalsInput = zod_1.z
    .object({ goals: activityValues })
    .strict()
    .refine((value) => Object.values(value.goals).every((goal) => goal == null || goal > 0), 'Targets must be positive, or null to remove them.');
exports.activityDayInput = zod_1.z
    .object({ values: activityValues })
    .strict()
    .refine((value) => Object.keys(value.values).length > 0, 'Include at least one reading.');
//# sourceMappingURL=wellness.input.js.map