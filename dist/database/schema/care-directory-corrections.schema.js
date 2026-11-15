"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.careDirectoryCorrections = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const care_directory_entries_schema_1 = require("./care-directory-entries.schema");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.careDirectoryCorrections = (0, pg_core_1.pgTable)('care_directory_corrections', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    entryId: (0, pg_core_1.uuid)('entry_id')
        .notNull()
        .references(() => care_directory_entries_schema_1.careDirectoryEntries.id),
    message: (0, pg_core_1.text)('message').notNull(),
    state: (0, pg_core_1.text)('state').notNull().default('open'),
    resolution: (0, pg_core_1.text)('resolution'),
    resolvedBy: (0, pg_core_1.uuid)('resolved_by').references(() => user_accounts_schema_1.userAccounts.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=care-directory-corrections.schema.js.map