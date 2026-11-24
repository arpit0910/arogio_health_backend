"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthArticles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.healthArticles = (0, pg_core_1.pgTable)('health_articles', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    // Keep the legacy import property mapped to the column renamed by migration 0032.
    source_id: (0, pg_core_1.text)('record_key').notNull().unique(),
    title_en: (0, pg_core_1.text)('title_en').notNull(),
    title_hi: (0, pg_core_1.text)('title_hi').notNull().default(''),
    excerpt_en: (0, pg_core_1.text)('excerpt_en').notNull().default(''),
    excerpt_hi: (0, pg_core_1.text)('excerpt_hi').notNull().default(''),
    content_en: (0, pg_core_1.text)('content_en').notNull(),
    content_hi: (0, pg_core_1.text)('content_hi').notNull().default(''),
    category: (0, pg_core_1.text)('category').notNull(),
    image_url: (0, pg_core_1.text)('image_url').notNull().default(''),
    author_name: (0, pg_core_1.text)('author_name').notNull().default(''),
    is_published: (0, pg_core_1.boolean)('is_published').notNull().default(false),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('health_articles_published_created').on(table.is_published, table.created_at),
    (0, pg_core_1.index)('health_articles_category_published').on(table.category, table.is_published),
]);
//# sourceMappingURL=health-articles.schema.js.map
