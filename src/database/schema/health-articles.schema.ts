import { binaryColumn } from '../types/binary-column';
import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const healthArticles = pgTable(
  'health_articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    record_key: text('record_key').notNull().unique(),
    title_en: text('title_en').notNull(),
    title_hi: text('title_hi').notNull().default(''),
    excerpt_en: text('excerpt_en').notNull().default(''),
    excerpt_hi: text('excerpt_hi').notNull().default(''),
    content_en: text('content_en').notNull(),
    content_hi: text('content_hi').notNull().default(''),
    category: text('category').notNull(),
    image_url: text('image_url').notNull().default(''),
    author_name: text('author_name').notNull().default(''),
    is_published: boolean('is_published').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('health_articles_published_created').on(table.is_published, table.created_at),
    index('health_articles_category_published').on(table.category, table.is_published),
  ],
);


export const healthArticleThumbnails = pgTable('health_article_thumbnails', {
  articleId: uuid('article_id').primaryKey().references(() => healthArticles.id, { onDelete: 'cascade' }),
  imageData: binaryColumn('image_data').notNull(),
  revision: uuid('revision').notNull().defaultRandom(),
});
