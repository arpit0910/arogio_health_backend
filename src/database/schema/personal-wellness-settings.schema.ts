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
        form?: string; strength?: string; unit?: string; alertType?: 'default' | 'gentle' | 'vibrate';
        recurrence?: 'daily' | 'weekly' | 'cycle' | 'sos'; weekdays?: number[];
        startDate?: string; endDate?: string | null; cycleOnDays?: number; cycleOffDays?: number;
        stock?: number | null; lowStockThreshold?: number; stockDebits?: Record<string, number>;
        doses: { time: string; amount: string; meal?: 'any' | 'before' | 'after' }[];
      }[]
    >()
    .notNull()
    .default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
