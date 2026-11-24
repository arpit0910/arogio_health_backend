import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { medicalDepartments } from './medical-departments.schema';
export const medicalDiseases = pgTable(
  'medical_diseases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    record_key: text('record_key').notNull().unique(),
    name_en: text('name_en').notNull(),
    name_hi: text('name_hi').notNull().default(''),
    description_en: text('description_en').notNull().default(''),
    description_hi: text('description_hi').notNull().default(''),
    department_id: uuid('department_id')
      .notNull()
      .references(() => medicalDepartments.id),
    is_active: boolean('is_active').notNull().default(false),
    version: integer('version').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('medical_diseases_name_en_unique').on(sql`lower(btrim(${table.name_en}))`),
    index('medical_diseases_department_active').on(table.department_id, table.is_active),
    check('medical_diseases_name_required', sql`length(btrim(${table.name_en})) > 0`),
    check('medical_diseases_version_positive', sql`${table.version} > 0`),
  ],
);
