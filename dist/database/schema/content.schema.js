"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAudit = exports.banners = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
const binary = (0, pg_core_1.customType)({
    dataType() {
        return 'bytea';
    },
});
exports.banners = (0, pg_core_1.pgTable)('home_banners', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    title: (0, pg_core_1.text)('title').notNull(),
    alt: (0, pg_core_1.text)('alt').notNull(),
    route: (0, pg_core_1.text)('route'),
    image: binary('image').notNull(),
    published: (0, pg_core_1.boolean)('published').notNull().default(false),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => users_schema_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('banners_published_order').on(t.published, t.sortOrder)]);
exports.adminAudit = (0, pg_core_1.pgTable)('admin_audit', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    actorId: (0, pg_core_1.uuid)('actor_id')
        .notNull()
        .references(() => users_schema_1.users.id),
    targetId: (0, pg_core_1.text)('target_id'),
    action: (0, pg_core_1.text)('action').notNull(),
    outcome: (0, pg_core_1.text)('outcome').notNull().default('requested'),
    metadata: (0, pg_core_1.jsonb)('metadata').$type().notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('admin_audit_created').on(t.createdAt)]);
//# sourceMappingURL=content.schema.js.map