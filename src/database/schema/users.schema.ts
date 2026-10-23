import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['active', 'disabled', 'pending']);
export const heightUnit = pgEnum('height_unit', ['cm', 'in']);
export const weightUnit = pgEnum('weight_unit', ['kg', 'lb']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fullName: text('full_name'),
    username: text('username'),
    email: text('email'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    mobileNumber: text('mobile_number'),
    mobileVerifiedAt: timestamp('mobile_verified_at', { withTimezone: true }),
    heightCm: real('height_cm'),
    weightKg: real('weight_kg'),
    heightValue: real('height_value'),
    heightUnit: heightUnit('height_unit'),
    weightValue: real('weight_value'),
    weightUnit: weightUnit('weight_unit'),
    passwordHash: text('password_hash'),
    status: userStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_username_unique').on(table.username),
    uniqueIndex('users_mobile_number_unique').on(table.mobileNumber),
    index('users_status_idx').on(table.status),
    check(
      'users_height_cm_range',
      sql`${table.heightCm} is null or ${table.heightCm} between 50 and 300`,
    ),
    check(
      'users_weight_kg_range',
      sql`${table.weightKg} is null or ${table.weightKg} between 2 and 500`,
    ),
    check(
      'users_height_measurement_complete',
      sql`(${table.heightValue} is null) = (${table.heightUnit} is null)`,
    ),
    check(
      'users_weight_measurement_complete',
      sql`(${table.weightValue} is null) = (${table.weightUnit} is null)`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
