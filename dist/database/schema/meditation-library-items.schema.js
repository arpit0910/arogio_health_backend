"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wellnessPracticeHistory = exports.wellnessPublicationVersions = exports.meditationLibraryItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.meditationLibraryItems = (0, pg_core_1.pgTable)('meditation_library_items', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    kind: (0, pg_core_1.text)('kind').$type().notNull(),
    section: (0, pg_core_1.text)('section')
        .$type()
        .notNull(),
    title_en: (0, pg_core_1.text)('title_en').notNull(),
    title_hi: (0, pg_core_1.text)('title_hi').notNull().default(''),
    description_en: (0, pg_core_1.text)('description_en').notNull().default(''),
    description_hi: (0, pg_core_1.text)('description_hi').notNull().default(''),
    preparation_en: (0, pg_core_1.text)('preparation_en').notNull().default(''),
    preparation_hi: (0, pg_core_1.text)('preparation_hi').notNull().default(''),
    impact_en: (0, pg_core_1.text)('impact_en').notNull().default(''),
    impact_hi: (0, pg_core_1.text)('impact_hi').notNull().default(''),
    sanskritName: (0, pg_core_1.text)('sanskrit_name').notNull().default(''),
    difficulty: (0, pg_core_1.text)('difficulty').$type().notNull().default('gentle'),
    imageUrl: (0, pg_core_1.text)('image_url').notNull().default(''),
    audioUrl: (0, pg_core_1.text)('audio_url').notNull().default(''),
    author: (0, pg_core_1.text)('author').notNull().default(''),
    videoId: (0, pg_core_1.text)('video_id'),
    durationSeconds: (0, pg_core_1.integer)('duration_seconds'),
    steps: (0, pg_core_1.jsonb)('steps').$type().notNull().default([]),
    repeat: (0, pg_core_1.integer)('repeat').notNull().default(1),
    published: (0, pg_core_1.boolean)('published').notNull().default(false),
    publishedVersion: (0, pg_core_1.integer)('published_version').notNull().default(0),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => user_accounts_schema_1.userAccounts.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('meditation_public_order').on(t.published, t.sortOrder, t.id)]);
exports.wellnessPublicationVersions = (0, pg_core_1.pgTable)('wellness_publication_versions', {
    itemId: (0, pg_core_1.uuid)('item_id').notNull(),
    version: (0, pg_core_1.integer)('version').notNull(),
    manifest: (0, pg_core_1.jsonb)('manifest').$type().notNull(),
    publishedBy: (0, pg_core_1.uuid)('published_by'),
    publishedAt: (0, pg_core_1.timestamp)('published_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [(0, pg_core_1.primaryKey)({ columns: [table.itemId, table.version] })]);
exports.wellnessPracticeHistory = (0, pg_core_1.pgTable)('wellness_practice_history', {
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    attemptId: (0, pg_core_1.uuid)('attempt_id').notNull(),
    itemId: (0, pg_core_1.uuid)('item_id').notNull(),
    version: (0, pg_core_1.integer)('version').notNull(),
    elapsedSeconds: (0, pg_core_1.integer)('elapsed_seconds').notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.attemptId] }),
    (0, pg_core_1.foreignKey)({ columns: [table.itemId, table.version], foreignColumns: [exports.wellnessPublicationVersions.itemId, exports.wellnessPublicationVersions.version] }),
    (0, pg_core_1.index)('wellness_practice_history_recent').on(table.userId, table.completedAt.desc(), table.attemptId),
]);
//# sourceMappingURL=meditation-library-items.schema.js.map