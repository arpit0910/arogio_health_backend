import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';

export const waterIntakeLogs = pgTable(
  'water_intake_logs',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    amountMl: integer('amount_ml').notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    targetMl: integer('target_ml').notNull(),
    taskId: text('task_id'),
  },
  (table) => [
    index('water_intake_logs_user_day').on(table.userId, table.day),
    uniqueIndex('water_intake_logs_task_once').on(table.userId, table.taskId),
    check('water_log_amount_range', sql`${table.amountMl} between 1 and 3000`),
  ],
);
