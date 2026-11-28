import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const medicalDepartments = pgTable(
  'medical_departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    record_key: text('record_key').notNull().unique(),
    name_en: text('name_en').notNull(),
    name_hi: text('name_hi').notNull().default(''),
    description_en: text('description_en').notNull().default(''),
    description_hi: text('description_hi').notNull().default(''),
    icon: text('icon').notNull().default('stethoscope'),
    image_url: text('image_url').notNull().default(''),
    sort_order: integer('sort_order').notNull().default(0),
    is_active: boolean('is_active').notNull().default(false),
    version: integer('version').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('medical_departments_name_en_unique').on(sql`lower(btrim(${table.name_en}))`),
    check('medical_departments_name_required', sql`length(btrim(${table.name_en})) > 0`),
    check('medical_departments_version_positive', sql`${table.version} > 0`),
  ],
);
