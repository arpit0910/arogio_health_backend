"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hospitals = void 0;
const binary_column_1 = require("../types/binary-column");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const care_directory_entries_schema_1 = require("./care-directory-entries.schema");
exports.hospitals = (0, pg_core_1.pgTable)('hospitals', {
    id: (0, pg_core_1.uuid)('id')
        .primaryKey()
        .references(() => care_directory_entries_schema_1.careDirectoryEntries.id, { onDelete: 'cascade' }),
    source_key: (0, pg_core_1.text)('source_key').notNull().unique(),
    name_en: (0, pg_core_1.text)('name_en').notNull(),
    name_hi: (0, pg_core_1.text)('name_hi').notNull().default(''),
    hospital_type: (0, pg_core_1.text)('hospital_type').notNull().default(''),
    address_line1: (0, pg_core_1.text)('address_line1').notNull().default(''),
    address_line2: (0, pg_core_1.text)('address_line2').notNull().default(''),
    landmark: (0, pg_core_1.text)('landmark').notNull().default(''),
    address_hi: (0, pg_core_1.text)('address_hi').notNull().default(''),
    city: (0, pg_core_1.text)('city').notNull(),
    state: (0, pg_core_1.text)('state').notNull(),
    pincode: (0, pg_core_1.text)('pincode').notNull().default(''),
    country_code_1: (0, pg_core_1.text)('country_code_1').notNull().default(''),
    phone_1: (0, pg_core_1.text)('phone_1'),
    country_code_2: (0, pg_core_1.text)('country_code_2').notNull().default(''),
    phone_2: (0, pg_core_1.text)('phone_2'),
    email: (0, pg_core_1.text)('email'),
    website: (0, pg_core_1.text)('website'),
    source_url: (0, pg_core_1.text)('source_url'),
    latitude: (0, pg_core_1.doublePrecision)('latitude'),
    longitude: (0, pg_core_1.doublePrecision)('longitude'),
    accepts_ayushman: (0, pg_core_1.boolean)('accepts_ayushman'),
    accepts_janaadhaar: (0, pg_core_1.boolean)('accepts_janaadhaar'),
    accepts_cghs: (0, pg_core_1.boolean)('accepts_cghs'),
    accepts_esic: (0, pg_core_1.boolean)('accepts_esic'),
    rgahs_approved: (0, pg_core_1.boolean)('rgahs_approved'),
    is_cashless: (0, pg_core_1.boolean)('is_cashless'),
    nabh_accredited: (0, pg_core_1.boolean)('nabh_accredited'),
    is_24_7: (0, pg_core_1.boolean)('is_24_7'),
    cashless_schemes: (0, pg_core_1.jsonb)('cashless_schemes').$type().notNull().default([]),
    specialties: (0, pg_core_1.jsonb)('specialties').$type().notNull().default([]),
    summary_en: (0, pg_core_1.text)('summary_en').notNull().default(''),
    summary_hi: (0, pg_core_1.text)('summary_hi').notNull().default(''),
    image_data: (0, binary_column_1.binaryColumn)('image_data'),
    image_alt: (0, pg_core_1.text)('image_alt').notNull().default(''),
    image_revision: (0, pg_core_1.uuid)('image_revision'),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.check)('hospitals_name_location_required', (0, drizzle_orm_1.sql) `length(btrim(${table.name_en})) > 0 and length(btrim(${table.city})) > 0 and length(btrim(${table.state})) > 0`),
    (0, pg_core_1.check)('hospitals_coordinates_valid', (0, drizzle_orm_1.sql) `(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null and ${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180)`),
    (0, pg_core_1.check)('hospitals_version_positive', (0, drizzle_orm_1.sql) `${table.version} > 0`),
]);
//# sourceMappingURL=hospitals.schema.js.map