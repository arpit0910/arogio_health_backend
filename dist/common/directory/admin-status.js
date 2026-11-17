"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeDoctorDepartment = exports.directoryStatusInput = exports.directoryStatuses = void 0;
exports.directoryPredicates = directoryPredicates;
exports.directoryCountFields = directoryCountFields;
exports.directoryRowStatus = directoryRowStatus;
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const schema_1 = require("../../database/schema");
exports.directoryStatuses = ['all', 'active', 'inactive', 'draft', 'incomplete', 'approved', 'expired', 'withdrawn', 'ready', 'published'];
exports.directoryStatusInput = zod_1.z.enum(exports.directoryStatuses).default('all');
exports.activeDoctorDepartment = (0, drizzle_orm_1.sql) `exists(select 1 from ${schema_1.doctorDepartments} dd join ${schema_1.medicalDepartments} dep on dep.id=dd.department_id where dd.doctor_id=${schema_1.doctors.id} and dep.is_active=true)`.mapWith(Boolean);
const blank = (column) => (0, drizzle_orm_1.sql) `nullif(btrim(${column}), '') is null`;
function directoryPredicates(kind) {
    const fresh = new Date(Date.now() - 180 * 86400000);
    const provider = kind === 'hospitals' ? schema_1.hospitals : schema_1.doctors;
    const active = kind === 'hospitals' ? (0, drizzle_orm_1.sql) `${schema_1.hospitals.listed}=true` : kind === 'blood-banks' ? (0, drizzle_orm_1.sql) `${schema_1.bloodBankDirectoryEntries.is_active}=true` : (0, drizzle_orm_1.sql) `(${schema_1.careDirectoryEntries.published}=true or ${schema_1.careDirectoryEntries.reviewedAt} is null)`;
    const approvedFlag = kind === 'blood-banks' ? schema_1.bloodBankDirectoryEntries.is_verified : schema_1.careDirectoryEntries.published;
    const reviewed = kind === 'blood-banks' ? schema_1.bloodBankDirectoryEntries.verified_at : schema_1.careDirectoryEntries.reviewedAt;
    const approved = (0, drizzle_orm_1.sql) `coalesce((${approvedFlag}=true and ${reviewed} >= ${fresh}), false)`;
    const expired = (0, drizzle_orm_1.sql) `(${approvedFlag}=true and (${reviewed} is null or ${reviewed} < ${fresh}))`;
    const incomplete = kind === 'blood-banks'
        ? (0, drizzle_orm_1.sql) `(${blank(schema_1.bloodBankDirectoryEntries.name_en)} or ${blank(schema_1.bloodBankDirectoryEntries.city)} or ${blank(schema_1.bloodBankDirectoryEntries.state)} or ${blank(schema_1.bloodBankDirectoryEntries.address_en)} or ${blank(schema_1.bloodBankDirectoryEntries.phone)} or ${blank(schema_1.bloodBankDirectoryEntries.source_url)})`
        : (0, drizzle_orm_1.sql) `(${blank(provider.name_en)} or ${blank(provider.city)} or ${blank(provider.state)} or ${blank(provider.address_line1)} or ${blank(provider.phone_1)} or ${blank(provider.source_url)} ${kind === 'doctors' ? (0, drizzle_orm_1.sql) `or ${blank(schema_1.doctors.registration_number)} or ${blank(schema_1.doctors.medical_council)} or jsonb_array_length(${schema_1.doctors.qualifications})=0 or not (${exports.activeDoctorDepartment})` : (0, drizzle_orm_1.sql) ``})`;
    return { active, inactive: (0, drizzle_orm_1.sql) `not (${active})`, draft: (0, drizzle_orm_1.sql) `${approvedFlag}=false and ${reviewed} is null`, withdrawn: (0, drizzle_orm_1.sql) `${approvedFlag}=false and ${reviewed} is not null`, incomplete, approved, expired, ready: (0, drizzle_orm_1.sql) `(${active}) and not (${incomplete}) and not (${approved})` };
}
function directoryCountFields(predicates) {
    return Object.fromEntries([['all', (0, drizzle_orm_1.sql) `count(*)::int`.mapWith(Number)], ...Object.entries(predicates).map(([key, condition]) => [key, (0, drizzle_orm_1.sql) `count(*) filter (where ${condition})::int`.mapWith(Number)])]);
}
function directoryRowStatus(kind, row) {
    const missingFields = [];
    const require = (label, value) => { if (typeof value !== 'string' || !value.trim())
        missingFields.push(label); };
    require('Name', row.name_en);
    require('City', row.city);
    require('State', row.state);
    require('Address', kind === 'blood-banks' ? row.address_en : row.address_line1);
    require('Phone', kind === 'blood-banks' ? row.phone : row.phone_1);
    require('Source URL', row.source_url);
    if (kind === 'doctors') {
        require('Registration number', row.registration_number);
        require('Medical council', row.medical_council);
        if (!row.qualifications?.length)
            missingFields.push('Qualifications');
        if (!row.activeDepartment)
            missingFields.push('Active department');
    }
    const reviewedAt = kind === 'blood-banks' ? row.verified_at : row.reviewedAt;
    const published = kind === 'blood-banks' ? row.is_verified : row.published;
    const active = kind === 'hospitals' ? row.listed === true : kind === 'blood-banks' ? row.is_active === true : published === true || !reviewedAt;
    const approved = !!published && !!reviewedAt && new Date(reviewedAt).getTime() >= Date.now() - 180 * 86400000;
    return { active, approved, missingFields, complete: !missingFields.length,
        reviewStatus: approved ? 'Approved' : published ? 'Review expired' : reviewedAt ? 'Withdrawn' : 'Draft',
        visibility: kind === 'doctors' ? approved ? 'Active' : active ? 'Not published' : 'Inactive' : active ? 'Active' : 'Inactive',
    };
}
//# sourceMappingURL=admin-status.js.map