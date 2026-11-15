"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.administrationAuditLogs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.administrationAuditLogs = (0, pg_core_1.pgTable)('administration_audit_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    actorId: (0, pg_core_1.uuid)('actor_id')
        .notNull()
        .references(() => user_accounts_schema_1.userAccounts.id),
    targetId: (0, pg_core_1.text)('target_id'),
    action: (0, pg_core_1.text)('action').notNull(),
    outcome: (0, pg_core_1.text)('outcome').notNull().default('requested'),
    metadata: (0, pg_core_1.jsonb)('metadata').$type().notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [(0, pg_core_1.index)('administration_audit_logs_created').on(t.createdAt)]);
//# sourceMappingURL=administration-audit-logs.schema.js.map