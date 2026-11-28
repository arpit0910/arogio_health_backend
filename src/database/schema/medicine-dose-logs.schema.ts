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

export const medicineDoseLogs = pgTable(
  'medicine_dose_logs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    medicineId: uuid('medicine_id').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    time: text('time').notNull(),
    status: text('status').$type<'taken' | 'skipped' | 'pending'>().notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.medicineId, table.day, table.time] }),
    index('medicine_dose_logs_user_day').on(table.userId, table.day),
    check('medicine_dose_status', sql`${table.status} in ('taken', 'skipped', 'pending')`),
    check('medicine_dose_clock', sql`${table.time} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
  ],
);
