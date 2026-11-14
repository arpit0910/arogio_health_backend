"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authSessions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.authSessions = (0, pg_core_1.pgTable)('auth_sessions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    tokenHash: (0, pg_core_1.text)('token_hash').notNull(),
    familyId: (0, pg_core_1.uuid)('family_id').notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    revokedAt: (0, pg_core_1.timestamp)('revoked_at', { withTimezone: true }),
    replacedBySessionId: (0, pg_core_1.uuid)('replaced_by_session_id').references(() => exports.authSessions.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: (0, pg_core_1.timestamp)('last_used_at', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('auth_sessions_token_hash_unique').on(table.tokenHash),
    (0, pg_core_1.index)('auth_sessions_user_id_idx').on(table.userId),
    (0, pg_core_1.index)('auth_sessions_family_id_idx').on(table.familyId),
    (0, pg_core_1.index)('auth_sessions_expires_at_idx').on(table.expiresAt),
]);
//# sourceMappingURL=auth-sessions.schema.js.map