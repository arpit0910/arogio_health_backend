"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menstrualPeriods = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.menstrualPeriods = (0, pg_core_1.pgTable)('menstrual_periods', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    startDate: (0, pg_core_1.date)('start_date', { mode: 'string' }).notNull(),
    endDate: (0, pg_core_1.date)('end_date', { mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('menstrual_periods_user_start').on(table.userId, table.startDate),
    (0, pg_core_1.check)('period_date_order', (0, drizzle_orm_1.sql) `${table.endDate} is null or ${table.endDate} >= ${table.startDate}`),
]);
//# sourceMappingURL=menstrual-periods.schema.js.map