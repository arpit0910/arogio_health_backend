"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankCorrections = exports.careCorrections = exports.careAffiliations = exports.careEntries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
const directory_schema_1 = require("./directory.schema");
exports.careEntries = (0, pg_core_1.pgTable)('care_entries', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    sourceKey: (0, pg_core_1.text)('source_key').notNull().unique(),
    kind: (0, pg_core_1.text)('kind').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    nameHi: (0, pg_core_1.text)('name_hi').notNull().default(''),
    city: (0, pg_core_1.text)('city').notNull().default('Jaipur'),
    address: (0, pg_core_1.text)('address').notNull().default(''),
    addressHi: (0, pg_core_1.text)('address_hi').notNull().default(''),
    phone: (0, pg_core_1.text)('phone'),
    sourceUrl: (0, pg_core_1.text)('source_url').notNull(),
    details: (0, pg_core_1.jsonb)('details').$type().notNull(),
    published: (0, pg_core_1.boolean)('published').notNull().default(false),
    reviewedAt: (0, pg_core_1.timestamp)('reviewed_at', { withTimezone: true }),
    reviewedBy: (0, pg_core_1.uuid)('reviewed_by').references(() => users_schema_1.users.id),
    reviewEvidence: (0, pg_core_1.text)('review_evidence'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('care_public_kind_city').on(t.published, t.kind, t.city)]);
exports.careAffiliations = (0, pg_core_1.pgTable)('care_affiliations', {
    doctorId: (0, pg_core_1.uuid)('doctor_id')
        .notNull()
        .references(() => exports.careEntries.id),
    hospitalId: (0, pg_core_1.uuid)('hospital_id')
        .notNull()
        .references(() => exports.careEntries.id),
}, (t) => [
    (0, pg_core_1.primaryKey)({ columns: [t.doctorId, t.hospitalId] }),
    (0, pg_core_1.index)('care_hospital_doctors').on(t.hospitalId),
]);
exports.careCorrections = (0, pg_core_1.pgTable)('care_corrections', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    entryId: (0, pg_core_1.uuid)('entry_id')
        .notNull()
        .references(() => exports.careEntries.id),
    message: (0, pg_core_1.text)('message').notNull(),
    state: (0, pg_core_1.text)('state').notNull().default('open'),
    resolution: (0, pg_core_1.text)('resolution'),
    resolvedBy: (0, pg_core_1.uuid)('resolved_by').references(() => users_schema_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
exports.bankCorrections = (0, pg_core_1.pgTable)('bank_corrections', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    bankId: (0, pg_core_1.uuid)('bank_id')
        .notNull()
        .references(() => directory_schema_1.bloodBanks.id),
    message: (0, pg_core_1.text)('message').notNull(),
    state: (0, pg_core_1.text)('state').notNull().default('open'),
    resolution: (0, pg_core_1.text)('resolution'),
    resolvedBy: (0, pg_core_1.uuid)('resolved_by').references(() => users_schema_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=care.schema.js.map