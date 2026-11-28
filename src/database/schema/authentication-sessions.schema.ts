import {
  type AnyPgColumn,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';

export const authenticationSessions = pgTable(
  'authentication_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userAccounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBySessionId: uuid('replaced_by_session_id').references(
      (): AnyPgColumn => authenticationSessions.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('authentication_sessions_token_hash_unique').on(table.tokenHash),
    index('authentication_sessions_user_id_idx').on(table.userId),
    index('authentication_sessions_family_id_idx').on(table.familyId),
    index('authentication_sessions_expires_at_idx').on(table.expiresAt),
  ],
);
