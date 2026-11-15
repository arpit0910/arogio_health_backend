import { binaryColumn } from '../types/binary-column';
import {
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

// One identity: the shared care row is the compatibility/search projection, not a second doctor.
export const doctors = pgTable(
  'doctors',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => careDirectoryEntries.id, { onDelete: 'cascade' }),
    source_key: text('source_key').notNull().unique(),
    name_en: text('name_en').notNull(),
    name_hi: text('name_hi').notNull().default(''),
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
    source_url: text('source_url'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    registration_number: text('registration_number').notNull().default(''),
    medical_council: text('medical_council').notNull().default(''),
    qualifications: jsonb('qualifications').$type<string[]>().notNull().default([]),
    languages: jsonb('languages').$type<string[]>().notNull().default([]),
    experience_years: integer('experience_years'),
    consultation_fee: doublePrecision('consultation_fee'),
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
      'doctors_name_location_required',
      sql`length(btrim(${table.name_en})) > 0 and length(btrim(${table.city})) > 0 and length(btrim(${table.state})) > 0`,
    ),
    check(
      'doctors_coordinates_valid',
      sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null and ${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180)`,
    ),
    check(
      'doctors_experience_valid',
      sql`${table.experience_years} is null or ${table.experience_years} between 0 and 100`,
    ),
    check(
      'doctors_fee_valid',
      sql`${table.consultation_fee} is null or ${table.consultation_fee} >= 0`,
    ),
    check('doctors_version_positive', sql`${table.version} > 0`),
  ],
);
