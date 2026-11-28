import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { bloodBankDirectoryEntries } from './blood-bank-directory-entries.schema';
import { userAccounts } from './user-accounts.schema';

export const bloodBankCorrections = pgTable('blood_bank_corrections', {
  id: uuid('id').defaultRandom().primaryKey(),
  bankId: uuid('bank_id')
    .notNull()
    .references(() => bloodBankDirectoryEntries.id),
  message: text('message').notNull(),
  state: text('state').notNull().default('open'),
  resolution: text('resolution'),
  resolvedBy: uuid('resolved_by').references(() => userAccounts.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
