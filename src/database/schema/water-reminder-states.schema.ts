import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';

export const waterReminderStates = pgTable(
  'water_reminder_states',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    taskId: text('task_id').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    status: text('status').$type<'pending' | 'skipped'>().notNull(),
    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.taskId] }),
    index('water_tasks_user_day').on(table.userId, table.day),
    check('water_task_status', sql`${table.status} in ('pending', 'skipped')`),
  ],
);
