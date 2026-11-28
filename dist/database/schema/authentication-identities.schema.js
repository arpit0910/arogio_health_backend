"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticationIdentities = exports.authProvider = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.authProvider = (0, pg_core_1.pgEnum)('auth_provider', ['google', 'phone_otp']);
exports.authenticationIdentities = (0, pg_core_1.pgTable)('authentication_identities', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    provider: (0, exports.authProvider)('provider').notNull(),
    providerSubject: (0, pg_core_1.text)('provider_subject').notNull(),
    providerEmail: (0, pg_core_1.text)('provider_email'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('authentication_identities_provider_subject_unique').on(table.provider, table.providerSubject),
    (0, pg_core_1.index)('authentication_identities_user_id_idx').on(table.userId),
]);
//# sourceMappingURL=authentication-identities.schema.js.map