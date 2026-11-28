"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthArticleCategories = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.healthArticleCategories = (0, pg_core_1.pgTable)('health_article_categories', {
    name: (0, pg_core_1.text)('name').primaryKey(),
    name_hi: (0, pg_core_1.text)('name_hi').notNull().default(''),
    description: (0, pg_core_1.text)('description').notNull().default(''),
    image_url: (0, pg_core_1.text)('image_url').notNull().default(''),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=health-article-categories.schema.js.map