"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menstrualDailyLogs = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.menstrualDailyLogs = (0, pg_core_1.pgTable)('menstrual_daily_logs', {
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    day: (0, pg_core_1.date)('day', { mode: 'string' }).notNull(),
    flow: (0, pg_core_1.text)('flow').notNull(),
    symptoms: (0, pg_core_1.jsonb)('symptoms').$type().notNull(),
    mood: (0, pg_core_1.text)('mood'),
    notes: (0, pg_core_1.text)('notes').notNull().default(''),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.day] }),
    (0, pg_core_1.check)('cycle_flow_values', (0, drizzle_orm_1.sql) `${table.flow} in ('none', 'spotting', 'light', 'medium', 'heavy')`),
]);
//# sourceMappingURL=menstrual-daily-logs.schema.js.map