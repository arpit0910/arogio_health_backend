import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';
export const authProvider = pgEnum('auth_provider', ['google', 'phone_otp']);
export type AuthIdentity = typeof authenticationIdentities.$inferSelect;
export const authenticationIdentities = pgTable(
  'authentication_identities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    provider: authProvider('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),
    providerEmail: text('provider_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('authentication_identities_provider_subject_unique').on(
      table.provider,
      table.providerSubject,
    ),
    index('authentication_identities_user_id_idx').on(table.userId),
  ],
);
