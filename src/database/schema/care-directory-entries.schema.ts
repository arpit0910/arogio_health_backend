import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';
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
export const careDirectoryEntries = pgTable(
  'care_directory_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordKey: text('record_key').notNull().unique(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    nameHi: text('name_hi').notNull().default(''),
    city: text('city').notNull().default('Jaipur'),
    address: text('address').notNull().default(''),
    addressHi: text('address_hi').notNull().default(''),
    phone: text('phone'),
    imageUrl: text('image_url'),
    imageAlt: text('image_alt').notNull().default(''),
    details: jsonb('details').$type<CareDetails>().notNull(),
    published: boolean('published').notNull().default(false),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => userAccounts.id),
    reviewEvidence: text('review_evidence'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('care_public_kind_city').on(t.published, t.kind, t.city)],
);
