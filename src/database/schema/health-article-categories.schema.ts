import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const healthArticleCategories = pgTable('health_article_categories', {
  name: text('name').primaryKey(),
  name_hi: text('name_hi').notNull().default(''),
  description: text('description').notNull().default(''),
  image_url: text('image_url').notNull().default(''),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
