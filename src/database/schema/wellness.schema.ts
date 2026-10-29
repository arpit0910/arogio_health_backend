import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  integer,
  text,
  date,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import type { WaterPlan, CycleSettings, ActivityTracking } from '../../modules/wellness/domain';

export const wellnessSettings = pgTable('wellness_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  activityTracking: jsonb('activity_tracking')
    .$type<ActivityTracking>()
    .notNull()
    .default({ goals: {}, days: [] }),
  waterPlan: jsonb('water_plan').$type<WaterPlan>(),
  cycleSettings: jsonb('cycle_settings').$type<CycleSettings>(),
  medicines: jsonb('medicines')
    .$type<
      {
        id: string;
        name: string;
        notes: string;
        enabled: boolean;
        doses: { time: string; amount: string }[];
      }[]
    >()
    .notNull()
    .default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const waterLogs = pgTable(
  'water_logs',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amountMl: integer('amount_ml').notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    targetMl: integer('target_ml').notNull(),
    taskId: text('task_id'),
  },
  (table) => [
    index('water_logs_user_day').on(table.userId, table.day),
    uniqueIndex('water_logs_task_once').on(table.userId, table.taskId),
    check('water_log_amount_range', sql`${table.amountMl} between 1 and 3000`),
  ],
);
export const waterTaskStates = pgTable(
  'water_task_states',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
export const cyclePeriods = pgTable(
  'cycle_periods',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
  },
  (table) => [
    index('cycle_periods_user_start').on(table.userId, table.startDate),
    check(
      'period_date_order',
      sql`${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
  ],
);
export const cycleEntries = pgTable(
  'cycle_entries',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
