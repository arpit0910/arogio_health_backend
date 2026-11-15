import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, uuid } from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';

export const menstrualPeriods = pgTable(
  'menstrual_periods',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
  },
  (table) => [
    index('menstrual_periods_user_start').on(table.userId, table.startDate),
    check(
      'period_date_order',
      sql`${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
  ],
);
