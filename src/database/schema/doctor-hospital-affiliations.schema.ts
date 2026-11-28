import {
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { doctors } from './doctors.schema';
import { hospitals } from './hospitals.schema';
export const doctorHospitalAffiliations = pgTable(
  'doctor_hospital_affiliations',
  {
    doctor_id: uuid('doctor_id')
      .notNull()
      .references(() => doctors.id, { onDelete: 'cascade' }),
    hospital_id: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id),
    role: text('role').notNull().default(''),
    consultation_mode: text('consultation_mode').notNull().default('in_person'),
    availability: text('availability').notNull().default(''),
    days_of_week: jsonb('days_of_week').$type<number[]>().notNull().default([]),
    start_time: text('start_time'),
    end_time: text('end_time'),
    consultation_fee: doublePrecision('consultation_fee'),
  },
  (t) => [
    primaryKey({ columns: [t.doctor_id, t.hospital_id] }),
    index('doctor_affiliations_hospital').on(t.hospital_id),
    check(
      'doctor_affiliation_fee_valid',
      sql`${t.consultation_fee} is null or ${t.consultation_fee} >= 0`,
    ),
    check(
      'doctor_affiliation_time_valid',
      sql`(${t.start_time} is null and ${t.end_time} is null) or (${t.start_time} is not null and ${t.end_time} is not null and ${t.start_time} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.end_time} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.start_time} < ${t.end_time})`,
    ),
  ],
);
