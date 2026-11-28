import {
  boolean,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';
const binary = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});
export const homeBanners = pgTable(
  'home_banners',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    alt: text('alt').notNull(),
    route: text('route'),
    image: binary('image').notNull(),
    published: boolean('published').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('banners_published_order').on(t.published, t.sortOrder)],
);
