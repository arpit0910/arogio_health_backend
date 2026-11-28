"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bloodBankCorrections = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const blood_bank_directory_entries_schema_1 = require("./blood-bank-directory-entries.schema");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.bloodBankCorrections = (0, pg_core_1.pgTable)('blood_bank_corrections', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    bankId: (0, pg_core_1.uuid)('bank_id')
        .notNull()
        .references(() => blood_bank_directory_entries_schema_1.bloodBankDirectoryEntries.id),
    message: (0, pg_core_1.text)('message').notNull(),
    state: (0, pg_core_1.text)('state').notNull().default('open'),
    resolution: (0, pg_core_1.text)('resolution'),
    resolvedBy: (0, pg_core_1.uuid)('resolved_by').references(() => user_accounts_schema_1.userAccounts.id),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=blood-bank-corrections.schema.js.map