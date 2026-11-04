"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meditationContent = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.meditationContent = (0, pg_core_1.pgTable)('meditation_content', {
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
    author: (0, pg_core_1.text)('author').notNull().default(''),
    videoId: (0, pg_core_1.text)('video_id'),
    durationSeconds: (0, pg_core_1.integer)('duration_seconds'),
    steps: (0, pg_core_1.jsonb)('steps').$type().notNull().default([]),
    repeat: (0, pg_core_1.integer)('repeat').notNull().default(1),
    published: (0, pg_core_1.boolean)('published').notNull().default(false),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => users_schema_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('meditation_public_order').on(t.published, t.sortOrder, t.id)]);
//# sourceMappingURL=meditation.schema.js.map