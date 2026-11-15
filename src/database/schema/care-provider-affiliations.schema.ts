import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { careDirectoryEntries } from './care-directory-entries.schema';

export const careProviderAffiliations = pgTable(
  'care_provider_affiliations',
  {
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => careDirectoryEntries.id),
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => careDirectoryEntries.id),
  },
  (t) => [
    primaryKey({ columns: [t.doctorId, t.hospitalId] }),
    index('care_hospital_doctors').on(t.hospitalId),
  ],
);
