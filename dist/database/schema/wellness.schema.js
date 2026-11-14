"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cycleEntries = exports.cyclePeriods = exports.waterTaskStates = exports.medicineDoses = exports.waterLogs = exports.wellnessSettings = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.wellnessSettings = (0, pg_core_1.pgTable)('wellness_settings', {
    userId: (0, pg_core_1.uuid)('user_id')
        .primaryKey()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    activityTracking: (0, pg_core_1.jsonb)('activity_tracking')
        .$type()
        .notNull()
        .default({ goals: {}, days: [] }),
    waterPlan: (0, pg_core_1.jsonb)('water_plan').$type(),
    cycleSettings: (0, pg_core_1.jsonb)('cycle_settings').$type(),
    medicines: (0, pg_core_1.jsonb)('medicines')
        .$type()
        .notNull()
        .default([]),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.waterLogs = (0, pg_core_1.pgTable)('water_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    amountMl: (0, pg_core_1.integer)('amount_ml').notNull(),
    loggedAt: (0, pg_core_1.timestamp)('logged_at', { withTimezone: true }).notNull(),
    day: (0, pg_core_1.date)('day', { mode: 'string' }).notNull(),
    targetMl: (0, pg_core_1.integer)('target_ml').notNull(),
    taskId: (0, pg_core_1.text)('task_id'),
}, (table) => [
    (0, pg_core_1.index)('water_logs_user_day').on(table.userId, table.day),
    (0, pg_core_1.uniqueIndex)('water_logs_task_once').on(table.userId, table.taskId),
    (0, pg_core_1.check)('water_log_amount_range', (0, drizzle_orm_1.sql) `${table.amountMl} between 1 and 3000`),
]);
exports.medicineDoses = (0, pg_core_1.pgTable)('medicine_doses', {
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    medicineId: (0, pg_core_1.uuid)('medicine_id').notNull(),
    day: (0, pg_core_1.date)('day', { mode: 'string' }).notNull(),
    time: (0, pg_core_1.text)('time').notNull(),
    status: (0, pg_core_1.text)('status').$type().notNull(),
    recordedAt: (0, pg_core_1.timestamp)('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    snoozedUntil: (0, pg_core_1.timestamp)('snoozed_until', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.medicineId, table.day, table.time] }),
    (0, pg_core_1.index)('medicine_doses_user_day').on(table.userId, table.day),
    (0, pg_core_1.check)('medicine_dose_status', (0, drizzle_orm_1.sql) `${table.status} in ('taken', 'skipped', 'pending')`),
    (0, pg_core_1.check)('medicine_dose_clock', (0, drizzle_orm_1.sql) `${table.time} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
]);
exports.waterTaskStates = (0, pg_core_1.pgTable)('water_task_states', {
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    taskId: (0, pg_core_1.text)('task_id').notNull(),
    day: (0, pg_core_1.date)('day', { mode: 'string' }).notNull(),
    status: (0, pg_core_1.text)('status').$type().notNull(),
    snoozedUntil: (0, pg_core_1.timestamp)('snoozed_until', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.taskId] }),
    (0, pg_core_1.index)('water_tasks_user_day').on(table.userId, table.day),
    (0, pg_core_1.check)('water_task_status', (0, drizzle_orm_1.sql) `${table.status} in ('pending', 'skipped')`),
]);
exports.cyclePeriods = (0, pg_core_1.pgTable)('cycle_periods', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    startDate: (0, pg_core_1.date)('start_date', { mode: 'string' }).notNull(),
    endDate: (0, pg_core_1.date)('end_date', { mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('cycle_periods_user_start').on(table.userId, table.startDate),
    (0, pg_core_1.check)('period_date_order', (0, drizzle_orm_1.sql) `${table.endDate} is null or ${table.endDate} >= ${table.startDate}`),
]);
exports.cycleEntries = (0, pg_core_1.pgTable)('cycle_entries', {
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    day: (0, pg_core_1.date)('day', { mode: 'string' }).notNull(),
    flow: (0, pg_core_1.text)('flow').notNull(),
    symptoms: (0, pg_core_1.jsonb)('symptoms').$type().notNull(),
    mood: (0, pg_core_1.text)('mood'),
    notes: (0, pg_core_1.text)('notes').notNull().default(''),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.day] }),
    (0, pg_core_1.check)('cycle_flow_values', (0, drizzle_orm_1.sql) `${table.flow} in ('none', 'spotting', 'light', 'medium', 'heavy')`),
]);
//# sourceMappingURL=wellness.schema.js.map