import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';

export const administrationAuditLogs = pgTable(
  'administration_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => userAccounts.id),
    targetId: text('target_id'),
    action: text('action').notNull(),
    outcome: text('outcome').notNull().default('requested'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('administration_audit_logs_created').on(t.createdAt)],
);
