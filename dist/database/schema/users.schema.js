"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.weightUnit = exports.heightUnit = exports.userStatus = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
exports.userStatus = (0, pg_core_1.pgEnum)('user_status', ['active', 'disabled', 'pending']);
exports.heightUnit = (0, pg_core_1.pgEnum)('height_unit', ['cm', 'in']);
exports.weightUnit = (0, pg_core_1.pgEnum)('weight_unit', ['kg', 'lb']);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    referralCode: (0, pg_core_1.text)('referral_code')
        .notNull()
        .default((0, drizzle_orm_1.sql) `upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))`),
    referredByUserId: (0, pg_core_1.uuid)('referred_by_user_id').references(() => exports.users.id),
    referredAt: (0, pg_core_1.timestamp)('referred_at', { withTimezone: true }),
    fullName: (0, pg_core_1.text)('full_name'),
    username: (0, pg_core_1.text)('username'),
    email: (0, pg_core_1.text)('email'),
    emailVerifiedAt: (0, pg_core_1.timestamp)('email_verified_at', { withTimezone: true }),
    mobileNumber: (0, pg_core_1.text)('mobile_number'),
    mobileVerifiedAt: (0, pg_core_1.timestamp)('mobile_verified_at', { withTimezone: true }),
    heightCm: (0, pg_core_1.real)('height_cm'),
    weightKg: (0, pg_core_1.real)('weight_kg'),
    heightValue: (0, pg_core_1.real)('height_value'),
    heightUnit: (0, exports.heightUnit)('height_unit'),
    weightValue: (0, pg_core_1.real)('weight_value'),
    weightUnit: (0, exports.weightUnit)('weight_unit'),
    profileSetup: (0, pg_core_1.jsonb)('profile_setup').$type(),
    profileCompletedAt: (0, pg_core_1.timestamp)('profile_completed_at', { withTimezone: true }),
    passwordHash: (0, pg_core_1.text)('password_hash'),
    deletionRequestedAt: (0, pg_core_1.timestamp)('deletion_requested_at', { withTimezone: true }),
    recoverableUntil: (0, pg_core_1.timestamp)('recoverable_until', { withTimezone: true }),
    role: (0, pg_core_1.text)('role').$type().notNull().default('user'),
    status: (0, exports.userStatus)('status').notNull().default('active'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('users_referral_code_unique').on(table.referralCode),
    (0, pg_core_1.index)('users_referred_by_idx').on(table.referredByUserId),
    (0, pg_core_1.check)('users_referral_not_self', (0, drizzle_orm_1.sql) `${table.referredByUserId} is null or ${table.referredByUserId} <> ${table.id}`),
    (0, pg_core_1.uniqueIndex)('users_email_unique').on(table.email),
    (0, pg_core_1.uniqueIndex)('users_username_unique').on(table.username),
    (0, pg_core_1.uniqueIndex)('users_mobile_number_unique').on(table.mobileNumber),
    (0, pg_core_1.check)('users_role_values', (0, drizzle_orm_1.sql) `${table.role} in ('user', 'super_admin')`),
    (0, pg_core_1.index)('users_status_idx').on(table.status),
    (0, pg_core_1.check)('users_height_cm_range', (0, drizzle_orm_1.sql) `${table.heightCm} is null or ${table.heightCm} between 50 and 300`),
    (0, pg_core_1.check)('users_weight_kg_range', (0, drizzle_orm_1.sql) `${table.weightKg} is null or ${table.weightKg} between 2 and 500`),
    (0, pg_core_1.check)('users_height_measurement_complete', (0, drizzle_orm_1.sql) `(${table.heightValue} is null) = (${table.heightUnit} is null)`),
    (0, pg_core_1.check)('users_weight_measurement_complete', (0, drizzle_orm_1.sql) `(${table.weightValue} is null) = (${table.weightUnit} is null)`),
]);
//# sourceMappingURL=users.schema.js.map