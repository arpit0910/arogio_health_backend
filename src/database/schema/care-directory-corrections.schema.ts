import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { careDirectoryEntries } from './care-directory-entries.schema';
import { userAccounts } from './user-accounts.schema';

export const careDirectoryCorrections = pgTable('care_directory_corrections', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id')
    .notNull()
    .references(() => careDirectoryEntries.id),
  message: text('message').notNull(),
  state: text('state').notNull().default('open'),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => userAccounts.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
