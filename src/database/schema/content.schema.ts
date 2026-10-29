import {
  customType,
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
const binary = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});
export const banners = pgTable(
  'home_banners',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    alt: text('alt').notNull(),
    route: text('route'),
    image: binary('image').notNull(),
    published: boolean('published').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('banners_published_order').on(t.published, t.sortOrder)],
);
export const adminAudit = pgTable(
  'admin_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    targetId: text('target_id'),
    action: text('action').notNull(),
    outcome: text('outcome').notNull().default('requested'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('admin_audit_created').on(t.createdAt)],
);
