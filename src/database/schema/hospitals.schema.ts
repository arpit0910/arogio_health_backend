import { binaryColumn } from '../types/binary-column';
import {
  boolean,
  check,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { careDirectoryEntries } from './care-directory-entries.schema';

// One identity: the shared care row is the compatibility/search projection, not a second hospital.
export const hospitals = pgTable(
  'hospitals',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => careDirectoryEntries.id, { onDelete: 'cascade' }),
    record_key: text('record_key').notNull().unique(),
    listed: boolean('listed').notNull().default(true),
    name_en: text('name_en').notNull(),
    name_hi: text('name_hi').notNull().default(''),
    hospital_type: text('hospital_type').notNull().default(''),
    address_line1: text('address_line1').notNull().default(''),
    address_line2: text('address_line2').notNull().default(''),
    landmark: text('landmark').notNull().default(''),
    address_hi: text('address_hi').notNull().default(''),
    city: text('city').notNull(),
    state: text('state').notNull(),
    pincode: text('pincode').notNull().default(''),
    country_code_1: text('country_code_1').notNull().default(''),
    phone_1: text('phone_1'),
    country_code_2: text('country_code_2').notNull().default(''),
    phone_2: text('phone_2'),
    email: text('email'),
    website: text('website'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    accepts_ayushman: boolean('accepts_ayushman'),
    accepts_janaadhaar: boolean('accepts_janaadhaar'),
    accepts_cghs: boolean('accepts_cghs'),
    accepts_esic: boolean('accepts_esic'),
    rgahs_approved: boolean('rgahs_approved'),
    is_cashless: boolean('is_cashless'),
    nabh_accredited: boolean('nabh_accredited'),
    is_24_7: boolean('is_24_7'),
    cashless_schemes: jsonb('cashless_schemes').$type<string[]>().notNull().default([]),
    specialties: jsonb('specialties').$type<string[]>().notNull().default([]),
    summary_en: text('summary_en').notNull().default(''),
    summary_hi: text('summary_hi').notNull().default(''),
    image_data: binaryColumn('image_data'),
    image_alt: text('image_alt').notNull().default(''),
    image_revision: uuid('image_revision'),
    version: integer('version').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'hospitals_name_location_required',
      sql`length(btrim(${table.name_en})) > 0 and length(btrim(${table.city})) > 0 and length(btrim(${table.state})) > 0`,
    ),
    check(
      'hospitals_coordinates_valid',
      sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null and ${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180)`,
    ),
    check('hospitals_version_positive', sql`${table.version} > 0`),
  ],
);
