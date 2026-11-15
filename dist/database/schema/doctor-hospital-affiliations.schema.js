"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorHospitalAffiliations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const doctors_schema_1 = require("./doctors.schema");
const hospitals_schema_1 = require("./hospitals.schema");
exports.doctorHospitalAffiliations = (0, pg_core_1.pgTable)('doctor_hospital_affiliations', {
    doctor_id: (0, pg_core_1.uuid)('doctor_id')
        .notNull()
        .references(() => doctors_schema_1.doctors.id, { onDelete: 'cascade' }),
    hospital_id: (0, pg_core_1.uuid)('hospital_id')
        .notNull()
        .references(() => hospitals_schema_1.hospitals.id),
    role: (0, pg_core_1.text)('role').notNull().default(''),
    consultation_mode: (0, pg_core_1.text)('consultation_mode').notNull().default('in_person'),
    availability: (0, pg_core_1.text)('availability').notNull().default(''),
    days_of_week: (0, pg_core_1.jsonb)('days_of_week').$type().notNull().default([]),
    start_time: (0, pg_core_1.text)('start_time'),
    end_time: (0, pg_core_1.text)('end_time'),
    consultation_fee: (0, pg_core_1.doublePrecision)('consultation_fee'),
}, (t) => [
    (0, pg_core_1.primaryKey)({ columns: [t.doctor_id, t.hospital_id] }),
    (0, pg_core_1.index)('doctor_affiliations_hospital').on(t.hospital_id),
    (0, pg_core_1.check)('doctor_affiliation_fee_valid', (0, drizzle_orm_1.sql) `${t.consultation_fee} is null or ${t.consultation_fee} >= 0`),
    (0, pg_core_1.check)('doctor_affiliation_time_valid', (0, drizzle_orm_1.sql) `(${t.start_time} is null and ${t.end_time} is null) or (${t.start_time} is not null and ${t.end_time} is not null and ${t.start_time} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.end_time} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.start_time} < ${t.end_time})`),
]);
//# sourceMappingURL=doctor-hospital-affiliations.schema.js.map