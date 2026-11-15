"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waterReminderStates = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.waterReminderStates = (0, pg_core_1.pgTable)('water_reminder_states', {
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    taskId: (0, pg_core_1.text)('task_id').notNull(),
    day: (0, pg_core_1.date)('day', { mode: 'string' }).notNull(),
    status: (0, pg_core_1.text)('status').$type().notNull(),
    snoozedUntil: (0, pg_core_1.timestamp)('snoozed_until', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.taskId] }),
    (0, pg_core_1.index)('water_tasks_user_day').on(table.userId, table.day),
    (0, pg_core_1.check)('water_task_status', (0, drizzle_orm_1.sql) `${table.status} in ('pending', 'skipped')`),
]);
//# sourceMappingURL=water-reminder-states.schema.js.map