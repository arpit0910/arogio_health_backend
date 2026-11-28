"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportFeedback = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.supportFeedback = (0, pg_core_1.pgTable)('support_feedback', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    subject: (0, pg_core_1.text)('subject').notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    state: (0, pg_core_1.text)('state').notNull().default('open'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [(0, pg_core_1.index)('support_feedback_created').on(table.createdAt)]);
//# sourceMappingURL=support-feedback.schema.js.map