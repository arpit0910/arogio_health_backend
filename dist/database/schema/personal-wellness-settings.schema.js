"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personalWellnessSettings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const user_accounts_schema_1 = require("./user-accounts.schema");
exports.personalWellnessSettings = (0, pg_core_1.pgTable)('personal_wellness_settings', {
    userId: (0, pg_core_1.uuid)('user_id')
        .primaryKey()
        .references(() => user_accounts_schema_1.userAccounts.id, { onDelete: 'cascade' }),
    activityTracking: (0, pg_core_1.jsonb)('activity_tracking')
        .$type()
        .notNull()
        .default({ goals: {}, days: [] }),
    waterPlan: (0, pg_core_1.jsonb)('water_plan').$type(),
    cycleSettings: (0, pg_core_1.jsonb)('cycle_settings').$type(),
    medicines: (0, pg_core_1.jsonb)('medicines')
        .$type()
        .notNull()
        .default([]),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=personal-wellness-settings.schema.js.map