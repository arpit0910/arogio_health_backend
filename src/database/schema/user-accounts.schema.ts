import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  jsonb,
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
export type User = typeof userAccounts.$inferSelect;
export type NewUser = typeof userAccounts.$inferInsert;
export const userAccounts = pgTable(
  'user_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    referralCode: text('referral_code')
      .notNull()
      .default(sql`upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))`),
    referredByUserId: uuid('referred_by_user_id').references((): AnyPgColumn => userAccounts.id),
    referredAt: timestamp('referred_at', { withTimezone: true }),
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
    profileSetup: jsonb('profile_setup').$type<Record<string, unknown>>(),
    profileCompletedAt: timestamp('profile_completed_at', { withTimezone: true }),
    passwordHash: text('password_hash'),
    deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
    recoverableUntil: timestamp('recoverable_until', { withTimezone: true }),
    role: text('role').$type<'user' | 'super_admin'>().notNull().default('user'),
    status: userStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_accounts_referral_code_unique').on(table.referralCode),
    index('user_accounts_referred_by_idx').on(table.referredByUserId),
    check(
      'user_accounts_referral_not_self',
      sql`${table.referredByUserId} is null or ${table.referredByUserId} <> ${table.id}`,
    ),
    uniqueIndex('user_accounts_email_unique').on(table.email),
    uniqueIndex('user_accounts_username_unique').on(table.username),
    uniqueIndex('user_accounts_mobile_number_unique').on(table.mobileNumber),
    check('user_accounts_role_values', sql`${table.role} in ('user', 'super_admin')`),
    index('user_accounts_status_idx').on(table.status),
    check(
      'user_accounts_height_cm_range',
      sql`${table.heightCm} is null or ${table.heightCm} between 50 and 300`,
    ),
    check(
      'user_accounts_weight_kg_range',
      sql`${table.weightKg} is null or ${table.weightKg} between 2 and 500`,
    ),
    check(
      'user_accounts_height_measurement_complete',
      sql`(${table.heightValue} is null) = (${table.heightUnit} is null)`,
    ),
    check(
      'user_accounts_weight_measurement_complete',
      sql`(${table.weightValue} is null) = (${table.weightUnit} is null)`,
    ),
  ],
);
