"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicineDoseLogs = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.medicineDoseLogs = (0, pg_core_1.pgTable)('medicine_dose_logs', {
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    medicineId: (0, pg_core_1.uuid)('medicine_id').notNull(),
    day: (0, pg_core_1.date)('day', { mode: 'string' }).notNull(),
    time: (0, pg_core_1.text)('time').notNull(),
    status: (0, pg_core_1.text)('status').$type().notNull(),
    recordedAt: (0, pg_core_1.timestamp)('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    snoozedUntil: (0, pg_core_1.timestamp)('snoozed_until', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.medicineId, table.day, table.time] }),
    (0, pg_core_1.index)('medicine_dose_logs_user_day').on(table.userId, table.day),
    (0, pg_core_1.check)('medicine_dose_status', (0, drizzle_orm_1.sql) `${table.status} in ('taken', 'skipped', 'pending')`),
    (0, pg_core_1.check)('medicine_dose_clock', (0, drizzle_orm_1.sql) `${table.time} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
]);
//# sourceMappingURL=medicine-dose-logs.schema.js.map