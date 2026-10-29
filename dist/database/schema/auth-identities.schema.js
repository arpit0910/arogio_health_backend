"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authIdentities = exports.authProvider = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.authProvider = (0, pg_core_1.pgEnum)('auth_provider', ['google', 'phone_otp']);
exports.authIdentities = (0, pg_core_1.pgTable)('auth_identities', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    provider: (0, exports.authProvider)('provider').notNull(),
    providerSubject: (0, pg_core_1.text)('provider_subject').notNull(),
    providerEmail: (0, pg_core_1.text)('provider_email'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('auth_identities_provider_subject_unique').on(table.provider, table.providerSubject),
    (0, pg_core_1.index)('auth_identities_user_id_idx').on(table.userId),
]);
//# sourceMappingURL=auth-identities.schema.js.map