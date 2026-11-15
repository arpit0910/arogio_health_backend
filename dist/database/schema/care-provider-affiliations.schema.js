"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.careProviderAffiliations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const care_directory_entries_schema_1 = require("./care-directory-entries.schema");
exports.careProviderAffiliations = (0, pg_core_1.pgTable)('care_provider_affiliations', {
    doctorId: (0, pg_core_1.uuid)('doctor_id')
        .notNull()
        .references(() => care_directory_entries_schema_1.careDirectoryEntries.id),
    hospitalId: (0, pg_core_1.uuid)('hospital_id')
        .notNull()
        .references(() => care_directory_entries_schema_1.careDirectoryEntries.id),
}, (t) => [
    (0, pg_core_1.primaryKey)({ columns: [t.doctorId, t.hospitalId] }),
    (0, pg_core_1.index)('care_hospital_doctors').on(t.hospitalId),
]);
//# sourceMappingURL=care-provider-affiliations.schema.js.map