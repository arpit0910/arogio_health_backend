"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.homeBanners = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
const binary = (0, pg_core_1.customType)({
    dataType() {
        return 'bytea';
    },
});
exports.homeBanners = (0, pg_core_1.pgTable)('home_banners', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    title: (0, pg_core_1.text)('title').notNull(),
    alt: (0, pg_core_1.text)('alt').notNull(),
    route: (0, pg_core_1.text)('route'),
    image: binary('image').notNull(),
    published: (0, pg_core_1.boolean)('published').notNull().default(false),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => user_accounts_schema_1.userAccounts.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('banners_published_order').on(t.published, t.sortOrder)]);
//# sourceMappingURL=home-banners.schema.js.map