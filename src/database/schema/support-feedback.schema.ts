import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';
export const supportFeedback = pgTable('support_feedback', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => userAccounts.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  state: text('state').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('support_feedback_created').on(table.createdAt)]);
