import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { bloodBanks } from './directory.schema';

export type CareDetails = {
  specialties: string[];
  qualifications: string;
  registration: string;
  languages: string[];
  providerType: string;
  summary: string;
  precautions: string;
  latitude: number | null;
  longitude: number | null;
};
export const careEntries = pgTable(
  'care_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceKey: text('source_key').notNull().unique(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    nameHi: text('name_hi').notNull().default(''),
    city: text('city').notNull().default('Jaipur'),
    address: text('address').notNull().default(''),
    addressHi: text('address_hi').notNull().default(''),
    phone: text('phone'),
    sourceUrl: text('source_url').notNull(),
    details: jsonb('details').$type<CareDetails>().notNull(),
    published: boolean('published').notNull().default(false),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewEvidence: text('review_evidence'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('care_public_kind_city').on(t.published, t.kind, t.city)],
);
export const careAffiliations = pgTable(
  'care_affiliations',
  {
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => careEntries.id),
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => careEntries.id),
  },
  (t) => [
    primaryKey({ columns: [t.doctorId, t.hospitalId] }),
    index('care_hospital_doctors').on(t.hospitalId),
  ],
);
export const careCorrections = pgTable('care_corrections', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id')
    .notNull()
    .references(() => careEntries.id),
  message: text('message').notNull(),
  state: text('state').notNull().default('open'),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const bankCorrections = pgTable('bank_corrections', {
  id: uuid('id').defaultRandom().primaryKey(),
  bankId: uuid('bank_id')
    .notNull()
    .references(() => bloodBanks.id),
  message: text('message').notNull(),
  state: text('state').notNull().default('open'),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
