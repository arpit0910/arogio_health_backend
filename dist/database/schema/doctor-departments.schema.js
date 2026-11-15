"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorDepartments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const doctors_schema_1 = require("./doctors.schema");
const medical_departments_schema_1 = require("./medical-departments.schema");
exports.doctorDepartments = (0, pg_core_1.pgTable)('doctor_departments', {
    doctor_id: (0, pg_core_1.uuid)('doctor_id')
        .notNull()
        .references(() => doctors_schema_1.doctors.id, { onDelete: 'cascade' }),
    department_id: (0, pg_core_1.uuid)('department_id')
        .notNull()
        .references(() => medical_departments_schema_1.medicalDepartments.id),
}, (t) => [
    (0, pg_core_1.primaryKey)({ columns: [t.doctor_id, t.department_id] }),
    (0, pg_core_1.index)('doctor_departments_department').on(t.department_id),
]);
//# sourceMappingURL=doctor-departments.schema.js.map