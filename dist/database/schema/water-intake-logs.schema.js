"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waterIntakeLogs = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.waterIntakeLogs = (0, pg_core_1.pgTable)('water_intake_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    amountMl: (0, pg_core_1.integer)('amount_ml').notNull(),
    loggedAt: (0, pg_core_1.timestamp)('logged_at', { withTimezone: true }).notNull(),
    day: (0, pg_core_1.date)('day', { mode: 'string' }).notNull(),
    targetMl: (0, pg_core_1.integer)('target_ml').notNull(),
    taskId: (0, pg_core_1.text)('task_id'),
}, (table) => [
    (0, pg_core_1.index)('water_intake_logs_user_day').on(table.userId, table.day),
    (0, pg_core_1.uniqueIndex)('water_intake_logs_task_once').on(table.userId, table.taskId),
    (0, pg_core_1.check)('water_log_amount_range', (0, drizzle_orm_1.sql) `${table.amountMl} between 1 and 3000`),
]);
//# sourceMappingURL=water-intake-logs.schema.js.map