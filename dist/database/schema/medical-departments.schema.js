"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicalDepartments = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
exports.medicalDepartments = (0, pg_core_1.pgTable)('medical_departments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    source_key: (0, pg_core_1.text)('source_key').notNull().unique(),
    name_en: (0, pg_core_1.text)('name_en').notNull(),
    name_hi: (0, pg_core_1.text)('name_hi').notNull().default(''),
    description_en: (0, pg_core_1.text)('description_en').notNull().default(''),
    description_hi: (0, pg_core_1.text)('description_hi').notNull().default(''),
    is_active: (0, pg_core_1.boolean)('is_active').notNull().default(false),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('medical_departments_name_en_unique').on((0, drizzle_orm_1.sql) `lower(btrim(${table.name_en}))`),
    (0, pg_core_1.check)('medical_departments_name_required', (0, drizzle_orm_1.sql) `length(btrim(${table.name_en})) > 0`),
    (0, pg_core_1.check)('medical_departments_version_positive', (0, drizzle_orm_1.sql) `${table.version} > 0`),
]);
//# sourceMappingURL=medical-departments.schema.js.map