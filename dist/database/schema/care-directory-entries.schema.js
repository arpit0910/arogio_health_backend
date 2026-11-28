"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.careDirectoryEntries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.careDirectoryEntries = (0, pg_core_1.pgTable)('care_directory_entries', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    recordKey: (0, pg_core_1.text)('record_key').notNull().unique(),
    kind: (0, pg_core_1.text)('kind').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    nameHi: (0, pg_core_1.text)('name_hi').notNull().default(''),
    city: (0, pg_core_1.text)('city').notNull().default('Jaipur'),
    address: (0, pg_core_1.text)('address').notNull().default(''),
    addressHi: (0, pg_core_1.text)('address_hi').notNull().default(''),
    phone: (0, pg_core_1.text)('phone'),
    imageUrl: (0, pg_core_1.text)('image_url'),
    imageAlt: (0, pg_core_1.text)('image_alt').notNull().default(''),
    details: (0, pg_core_1.jsonb)('details').$type().notNull(),
    published: (0, pg_core_1.boolean)('published').notNull().default(false),
    reviewedAt: (0, pg_core_1.timestamp)('reviewed_at', { withTimezone: true }),
    reviewedBy: (0, pg_core_1.uuid)('reviewed_by').references(() => user_accounts_schema_1.userAccounts.id),
    reviewEvidence: (0, pg_core_1.text)('review_evidence'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('care_public_kind_city').on(t.published, t.kind, t.city)]);
//# sourceMappingURL=care-directory-entries.schema.js.map