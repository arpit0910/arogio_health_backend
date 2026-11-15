"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bloodBankDirectoryEntries = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
exports.bloodBankDirectoryEntries = (0, pg_core_1.pgTable)('blood_bank_directory_entries', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    source_id: (0, pg_core_1.text)('source_id').notNull().unique(),
    name_en: (0, pg_core_1.text)('name_en').notNull(),
    name_hi: (0, pg_core_1.text)('name_hi').notNull().default(''),
    city: (0, pg_core_1.text)('city').notNull(),
    state: (0, pg_core_1.text)('state').notNull(),
    pincode: (0, pg_core_1.text)('pincode'),
    landmark: (0, pg_core_1.text)('landmark'),
    address_en: (0, pg_core_1.text)('address_en').notNull(),
    address_hi: (0, pg_core_1.text)('address_hi').notNull().default(''),
    country_code: (0, pg_core_1.text)('country_code').notNull().default('+91'),
    phone: (0, pg_core_1.text)('phone'),
    emergency_country_code: (0, pg_core_1.text)('emergency_country_code').notNull().default('+91'),
    emergency_phone: (0, pg_core_1.text)('emergency_phone'),
    email: (0, pg_core_1.text)('email'),
    website: (0, pg_core_1.text)('website'),
    is_verified: (0, pg_core_1.boolean)('is_verified').notNull().default(false),
    source_url: (0, pg_core_1.text)('source_url'),
    verified_at: (0, pg_core_1.timestamp)('verified_at', { withTimezone: true }),
    is_24_7: (0, pg_core_1.boolean)('is_24_7').notNull().default(false),
    is_government: (0, pg_core_1.boolean)('is_government').notNull().default(false),
    component_facility: (0, pg_core_1.boolean)('component_facility').notNull().default(false),
    apheresis_facility: (0, pg_core_1.boolean)('apheresis_facility').notNull().default(false),
    available_blood_groups: (0, pg_core_1.text)('available_blood_groups').array().notNull().default([]),
    latitude: (0, pg_core_1.doublePrecision)('latitude'),
    longitude: (0, pg_core_1.doublePrecision)('longitude'),
    is_active: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('blood_bank_directory_entries_city').on(table.city),
    (0, pg_core_1.index)('blood_bank_directory_entries_active_geo').on(table.is_active, table.latitude, table.longitude),
    (0, pg_core_1.check)('blood_bank_coordinates', (0, drizzle_orm_1.sql) `(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null and ${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180)`),
]);
//# sourceMappingURL=blood-bank-directory-entries.schema.js.map