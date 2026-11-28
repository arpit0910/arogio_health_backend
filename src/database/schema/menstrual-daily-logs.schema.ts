import { sql } from 'drizzle-orm';
import { check, date, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';

export const menstrualDailyLogs = pgTable(
  'menstrual_daily_logs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    flow: text('flow').notNull(),
    symptoms: jsonb('symptoms').$type<string[]>().notNull(),
    mood: text('mood'),
    notes: text('notes').notNull().default(''),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day] }),
    check(
      'cycle_flow_values',
      sql`${table.flow} in ('none', 'spotting', 'light', 'medium', 'heavy')`,
    ),
  ],
);
