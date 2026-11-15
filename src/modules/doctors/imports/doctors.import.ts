import { parseCsv } from '../../health-resources/imports/csv';
import { workbookToCsv } from '../../health-resources/imports/workbook';
import { doctorInput, type DoctorInput } from '../requests/doctors.input';

export const doctorHeaders = [
  'source_key',
  'name_en',
  'name_hi',
  'registration_number',
  'medical_council',
  'qualifications',
  'experience_years',
  'consultation_fee',
  'languages',
  'address_line1',
  'address_line2',
  'landmark',
  'address_hi',
  'city',
  'state',
  'pincode',
  'country_code_1',
  'phone_1',
  'country_code_2',
  'phone_2',
  'email',
  'website',
  'source_url',
  'latitude',
  'longitude',
  'summary_en',
  'summary_hi',
  'department_source_keys',
  'hospital_source_keys',
  'schedule_days',
  'schedule_start',
  'schedule_end',
  'consultation_mode',
  'hospital_role',
  'availability',
  'hospital_consultation_fee',
] as const;
export type DoctorMasters = {
  departments: { id: string; source_key: string; name_en: string }[];
  hospitals: { id: string; source_key: string; name_en: string; city: string }[];
};
const aliases: Record<string, string> = {
  doctor_id: 'id',
  doctor_hospital_role: 'hospital_role',
  days_of_week: 'schedule_days',
  start_time: 'schedule_start',
  end_time: 'schedule_end',
  education_degrees: 'qualifications',
  languages_spoken: 'languages',
  about_en: 'summary_en',
  about_hi: 'summary_hi',
  phone: 'phone_1',
  country_code: 'country_code_1',
};
function boolean(value: string) {
  if (!value) return null;
  if (/^(1|true)$/i.test(value)) return true;
  if (/^(0|false)$/i.test(value)) return false;
  throw new Error('Boolean fields must be 1/0 or true/false; blank means unknown.');
}
export async function prepareDoctors(
  file: Express.Multer.File | undefined,
  masters: DoctorMasters,
) {
  if (!file?.buffer.length || file.buffer.length > 8 * 1024 * 1024)
    throw new Error('Choose a CSV or XLSX file up to 8 MB.');
  const extension = file.originalname.toLowerCase().split('.').pop();
  if (!['csv', 'xlsx'].includes(extension ?? '')) throw new Error('Use a .csv or .xlsx file.');
  const rows = parseCsv(extension === 'xlsx' ? await workbookToCsv(file.buffer) : file.buffer),
    headers = Object.keys(rows[0]!);
  if (
    (!headers.includes('name_en') && !headers.includes('first_name')) ||
    !headers.includes('city') ||
    !headers.includes('state') ||
    (!headers.includes('source_key') &&
      !headers.includes('id') &&
      !headers.includes('doctor_id')) ||
    headers.some(
      (header) =>
        ![
          ...doctorHeaders,
          ...Object.keys(aliases),
          'id',
          'is_verified',
          'first_name',
          'last_name',
          'department_id',
          'department_name_en',
          'hospital_id',
          'hospital_name',
          'hospital_city',
          'department_name_hi',
          'doctor_hospital_link_id',
          'gender',
        ].includes(header),
    )
  )
    throw new Error(
      'Use the doctor template or supported SwasthyaSearch export headers. Name, city, state and source_key or legacy id are required.',
    );
  const valid: { row: number; value: DoctorInput }[] = [],
    errors: { row: number; message: string }[] = [],
    keys = new Set<string>();
  let ignoredVerificationFlags = 0;
  let ignoredMetadataFields = 0;
  rows.forEach((row, index) => {
    try {
      ignoredMetadataFields += ['gender', 'doctor_hospital_link_id', 'department_name_hi'].filter(
        (k) => row[k]?.trim(),
      ).length;
      const input: Record<string, unknown> = {};
      for (const [raw, value] of Object.entries(row)) {
        if (
          [
            'id',
            'is_verified',
            'first_name',
            'last_name',
            'department_id',
            'department_name_en',
            'hospital_id',
            'hospital_name',
            'hospital_city',
            'department_name_hi',
            'doctor_hospital_link_id',
            'gender',
          ].includes(raw)
        )
          continue;
        const key = aliases[raw] ?? raw,
          text = value.trim();
        if (key in input && text && input[key] !== text)
          throw new Error(`Conflicting columns for ${key}.`);
        if (!(key in input) || text) input[key] = text;
      }
      const legacyIds = [row.id, row.doctor_id].map((v) => v?.trim()).filter(Boolean);
      if (new Set(legacyIds).size > 1) throw new Error('Conflicting legacy doctor IDs.');
      const legacyId = legacyIds[0] || '';
      delete input.id;
      if (row.source_key?.trim() && legacyId)
        throw new Error('Supply source_key or legacy id, not both.');
      input.source_key =
        row.source_key?.trim() ||
        (/^\d{1,20}$/.test(legacyId) ? `swasthya:doctor:${legacyId}` : '');
      const textValue = (key: string) => {
        const value = input[key];
        return typeof value === 'string' ? value : '';
      };

      for (const key of ['latitude', 'longitude', 'experience_years', 'consultation_fee'])
        input[key] = textValue(key).trim() ? Number(textValue(key)) : null;
      for (const key of ['phone_1', 'phone_2', 'email', 'website', 'source_url'])
        if (!input[key]) input[key] = null;
      if (typeof input.website === 'string' && !/^[a-z][a-z0-9+.-]*:/i.test(input.website))
        input.website = 'https://' + input.website;
      for (const key of ['qualifications', 'languages'])
        input[key] = textValue(key)
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean);
      if (row.is_verified?.trim()) {
        boolean(row.is_verified.trim());
        ignoredVerificationFlags++;
      }
      if (!input.name_en)
        input.name_en = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
      const split = (text: string) =>
        text
          .split(';')
          .map((v) => v.trim())
          .filter(Boolean);
      const departmentRefs = split(textValue('department_source_keys'));
      if (row.department_id?.trim())
        departmentRefs.push(
          /^\d+$/.test(row.department_id.trim())
            ? 'swasthya:' + row.department_id.trim()
            : row.department_id.trim(),
        );
      if (row.department_name_en?.trim()) {
        const found = masters.departments.filter(
          (v) => v.name_en.toLowerCase() === row.department_name_en!.trim().toLowerCase(),
        );
        if (found.length !== 1)
          throw new Error('Department name must match one existing department exactly.');
        departmentRefs.push(found[0]!.id);
      }
      input.department_ids = [
        ...new Set(
          departmentRefs.map((ref) => {
            const found = masters.departments.find((v) => v.source_key === ref || v.id === ref);
            if (!found)
              throw new Error(
                `Unknown department reference: ${ref}. Create or import departments first.`,
              );
            return found.id;
          }),
        ),
      ];
      const hospitalRefs = split(textValue('hospital_source_keys'));
      if (row.hospital_id?.trim())
        hospitalRefs.push(
          /^\d+$/.test(row.hospital_id.trim())
            ? 'swasthya:hospital:' + row.hospital_id.trim()
            : row.hospital_id.trim(),
        );
      if (row.hospital_name?.trim()) {
        const found = masters.hospitals.filter(
          (h) =>
            h.name_en.trim().toLowerCase() === row.hospital_name!.trim().toLowerCase() &&
            (!row.hospital_city?.trim() ||
              h.city.toLowerCase() === row.hospital_city.trim().toLowerCase()),
        );
        if (found.length !== 1)
          throw new Error('Hospital name and city must identify one existing hospital.');
        if (
          hospitalRefs.length &&
          !hospitalRefs.every((ref) => ref === found[0]!.id || ref === found[0]!.source_key)
        )
          throw new Error('Hospital name and reference disagree.');
        hospitalRefs.push(found[0]!.id);
      }
      const resolvedHospitals = [
        ...new Set(
          hospitalRefs.map((ref) => {
            const h = masters.hospitals.find((v) => v.source_key === ref || v.id === ref);
            if (!h) throw new Error(`Unknown hospital reference: ${ref}.`);
            return h.id;
          }),
        ),
      ];
      input.affiliations = resolvedHospitals.map((ref) => {
        const found = masters.hospitals.find((v) => v.source_key === ref || v.id === ref);
        if (!found)
          throw new Error(`Unknown hospital reference: ${ref}. Create or import hospitals first.`);
        return {
          hospital_id: found.id,
          role: textValue('hospital_role'),
          consultation_mode: textValue('consultation_mode') || 'in_person',
          availability: textValue('availability'),
          days_of_week: textValue('schedule_days')
            .split(/[;,]/)
            .map((v) => v.trim())
            .filter(Boolean)
            .map((v) => {
              if (/^\d$/.test(v)) return Number(v);
              const index = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(
                v.slice(0, 3).toLowerCase(),
              );
              if (index < 0) throw new Error('Weekdays must use 0?6 or weekday names.');
              return index;
            }),
          start_time:
            textValue('schedule_start').replace(/:00$/, (v) =>
              textValue('schedule_start').length === 8 ? '' : v,
            ) || null,
          end_time:
            textValue('schedule_end').replace(/:00$/, (v) =>
              textValue('schedule_end').length === 8 ? '' : v,
            ) || null,
          consultation_fee: textValue('hospital_consultation_fee')
            ? Number(textValue('hospital_consultation_fee'))
            : null,
        };
      });
      if (
        !hospitalRefs.length &&
        [
          'schedule_days',
          'schedule_start',
          'schedule_end',
          'consultation_mode',
          'hospital_role',
          'availability',
          'hospital_consultation_fee',
        ].some((key) => textValue(key))
      )
        throw new Error('Schedule fields require a hospital reference.');
      for (const key of [
        'department_source_keys',
        'hospital_source_keys',
        'schedule_days',
        'schedule_start',
        'schedule_end',
        'consultation_mode',
        'hospital_role',
        'availability',
        'hospital_consultation_fee',
      ])
        delete input[key];
      const value = doctorInput.parse(input);
      if (keys.has(value.source_key)) {
        if (!row.doctor_id?.trim()) throw new Error('Duplicate source_key in this file.');
        const previous = valid.find((v) => v.value.source_key === value.source_key)!;
        const profile = (v: DoctorInput) =>
          JSON.stringify({ ...v, affiliations: [], department_ids: [] });
        if (profile(previous.value) !== profile(value))
          throw new Error('Conflicting profiles for the same legacy doctor.');
        for (const link of value.affiliations) {
          if (previous.value.affiliations.some((a) => a.hospital_id === link.hospital_id))
            throw new Error('Duplicate doctor/hospital pair in legacy export.');
          previous.value.affiliations.push(link);
        }
        previous.value.department_ids = [
          ...new Set([...previous.value.department_ids, ...value.department_ids]),
        ];
        previous.value = doctorInput.parse(previous.value);
        return;
      }
      keys.add(value.source_key);
      valid.push({ row: index + 2, value });
    } catch (error) {
      errors.push({
        row: index + 2,
        message: error instanceof Error ? error.message : 'Invalid doctor row.',
      });
    }
  });
  return {
    rows: valid,
    errors,
    totalRows: rows.length,
    ignoredVerificationFlags,
    ignoredMetadataFields,
  };
}
