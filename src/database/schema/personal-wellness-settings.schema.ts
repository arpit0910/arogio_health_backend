import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import type {
  ActivityTracking,
  CycleSettings,
  WaterPlan,
} from '../../modules/personal-wellness/domain/personal-wellness.domain';
import { userAccounts } from './user-accounts.schema';

export const personalWellnessSettings = pgTable('personal_wellness_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => userAccounts.id, { onDelete: 'cascade' }),
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
