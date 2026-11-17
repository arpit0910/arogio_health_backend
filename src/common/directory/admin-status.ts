import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { hospitals, doctors, doctorDepartments, medicalDepartments, bloodBankDirectoryEntries as banks, careDirectoryEntries as care } from '../../database/schema';

export const directoryStatuses = ['all', 'active', 'inactive', 'draft', 'incomplete', 'approved', 'expired', 'withdrawn', 'ready', 'published'] as const;
export const directoryStatusInput = z.enum(directoryStatuses).default('all');
export type DirectoryKind = 'hospitals' | 'doctors' | 'blood-banks';
export const activeDoctorDepartment = sql<boolean>`exists(select 1 from ${doctorDepartments} dd join ${medicalDepartments} dep on dep.id=dd.department_id where dd.doctor_id=${doctors.id} and dep.is_active=true)`.mapWith(Boolean);
const blank = (column: unknown) => sql`nullif(btrim(${column}), '') is null`;
export function directoryPredicates(kind: DirectoryKind) {
  const fresh = new Date(Date.now() - 180 * 86400000);
  const provider = kind === 'hospitals' ? hospitals : doctors;
  const active = kind === 'hospitals' ? sql`${hospitals.listed}=true` : kind === 'blood-banks' ? sql`${banks.is_active}=true` : sql`(${care.published}=true or ${care.reviewedAt} is null)`;
  const approvedFlag = kind === 'blood-banks' ? banks.is_verified : care.published;
  const reviewed = kind === 'blood-banks' ? banks.verified_at : care.reviewedAt;
  const approved = sql`coalesce((${approvedFlag}=true and ${reviewed} >= ${fresh}), false)`;
  const expired = sql`(${approvedFlag}=true and (${reviewed} is null or ${reviewed} < ${fresh}))`;
  const incomplete = kind === 'blood-banks'
    ? sql`(${blank(banks.name_en)} or ${blank(banks.city)} or ${blank(banks.state)} or ${blank(banks.address_en)} or ${blank(banks.phone)} or ${blank(banks.source_url)})`
    : sql`(${blank(provider.name_en)} or ${blank(provider.city)} or ${blank(provider.state)} or ${blank(provider.address_line1)} or ${blank(provider.phone_1)} or ${blank(provider.source_url)} ${kind === 'doctors' ? sql`or ${blank(doctors.registration_number)} or ${blank(doctors.medical_council)} or jsonb_array_length(${doctors.qualifications})=0 or not (${activeDoctorDepartment})` : sql``})`;
  return { active, inactive: sql`not (${active})`, draft: sql`${approvedFlag}=false and ${reviewed} is null`, withdrawn: sql`${approvedFlag}=false and ${reviewed} is not null`, incomplete, approved, expired, ready: sql`(${active}) and not (${incomplete}) and not (${approved})` };
}
export function directoryCountFields(predicates: ReturnType<typeof directoryPredicates>) {
  return Object.fromEntries([['all', sql<number>`count(*)::int`.mapWith(Number)], ...Object.entries(predicates).map(([key, condition]) => [key, sql<number>`count(*) filter (where ${condition})::int`.mapWith(Number)])]) as Record<string, SQL<number>>;
}

type StatusRow = {
  name_en: string; city: string; state: string; source_url?: string | null;
  address_line1?: string; address_en?: string; phone_1?: string | null; phone?: string | null;
  listed?: boolean; published?: boolean; reviewedAt?: Date | string | null;
  is_active?: boolean; is_verified?: boolean; verified_at?: Date | string | null;
  registration_number?: string; medical_council?: string; qualifications?: string[]; activeDepartment?: boolean;
};
export function directoryRowStatus(kind: DirectoryKind, row: StatusRow) {
  const missingFields: string[] = [];
  const require = (label: string, value: unknown) => { if (typeof value !== 'string' || !value.trim()) missingFields.push(label); };
  require('Name', row.name_en); require('City', row.city); require('State', row.state);
  require('Address', kind === 'blood-banks' ? row.address_en : row.address_line1);
  require('Phone', kind === 'blood-banks' ? row.phone : row.phone_1);
  require('Source URL', row.source_url);
  if (kind === 'doctors') {
    require('Registration number', row.registration_number); require('Medical council', row.medical_council);
    if (!row.qualifications?.length) missingFields.push('Qualifications');
    if (!row.activeDepartment) missingFields.push('Active department');
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
