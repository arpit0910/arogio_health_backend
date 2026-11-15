import { parseCsv } from '../../health-resources/imports/csv';
import { workbookToCsv } from '../../health-resources/imports/workbook';
import { hospitalInput, type HospitalInput } from '../requests/hospitals.input';

export const hospitalHeaders = [
  'source_key',
  'name_en',
  'name_hi',
  'hospital_type',
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
  'accepts_ayushman',
  'accepts_janaadhaar',
  'accepts_cghs',
  'accepts_esic',
  'rgahs_approved',
  'is_cashless',
  'nabh_accredited',
  'is_24_7',
  'cashless_schemes',
  'specialties',
  'summary_en',
  'summary_hi',
] as const;
const aliases: Record<string, string> = {
  type: 'hospital_type',
  address: 'address_line1',
  phone: 'phone_1',
  country_code: 'country_code_1',
  emergency_phone_1: 'phone_1',
  emergency_phone_2: 'phone_2',
  emergency_country_code_1: 'country_code_1',
  emergency_country_code_2: 'country_code_2',
  accepts_ayushman_card: 'accepts_ayushman',
  accepts_jan_aadhaar: 'accepts_janaadhaar',
  cashless_treatment_available: 'is_cashless',
  cashless_schemes_list: 'cashless_schemes',
};
const flags = [
  'accepts_ayushman',
  'accepts_janaadhaar',
  'accepts_cghs',
  'accepts_esic',
  'rgahs_approved',
  'is_cashless',
  'nabh_accredited',
  'is_24_7',
];
function boolean(value: string) {
  if (!value) return null;
  if (/^(1|true)$/i.test(value)) return true;
  if (/^(0|false)$/i.test(value)) return false;
  throw new Error('Boolean fields must be 1/0 or true/false; blank means unknown.');
}
export async function prepareHospitals(file?: Express.Multer.File) {
  if (!file?.buffer.length || file.buffer.length > 8 * 1024 * 1024)
    throw new Error('Choose a CSV or XLSX file up to 8 MB.');
  const extension = file.originalname.toLowerCase().split('.').pop();
  if (!['csv', 'xlsx'].includes(extension ?? '')) throw new Error('Use a .csv or .xlsx file.');
  const rows = parseCsv(extension === 'xlsx' ? await workbookToCsv(file.buffer) : file.buffer),
    headers = Object.keys(rows[0]!);
  if (
    !headers.includes('name_en') ||
    !headers.includes('city') ||
    !headers.includes('state') ||
    (!headers.includes('source_key') && !headers.includes('id')) ||
    headers.some(
      (header) =>
        ![...hospitalHeaders, ...Object.keys(aliases), 'id', 'is_verified'].includes(header),
    )
  )
    throw new Error(
      'Use the hospital template or supported SwasthyaSearch export headers. Name, city, state and source_key or legacy id are required.',
    );
  const valid: { row: number; value: HospitalInput }[] = [],
    errors: { row: number; message: string }[] = [],
    keys = new Set<string>();
  let ignoredVerificationFlags = 0;
  rows.forEach((row, index) => {
    try {
      const input: Record<string, unknown> = {};
      for (const [raw, value] of Object.entries(row)) {
        if (['id', 'is_verified'].includes(raw)) continue;
        const key = aliases[raw] ?? raw,
          text = value.trim();
        if (key in input && text && input[key] !== text)
          throw new Error(`Conflicting columns for ${key}.`);
        if (!(key in input) || text) input[key] = text;
      }
      if (row.source_key?.trim() && row.id?.trim())
        throw new Error('Supply source_key or legacy id, not both.');
      input.source_key =
        row.source_key?.trim() ||
        (/^\d{1,20}$/.test(row.id?.trim() ?? '') ? `swasthya:hospital:${row.id!.trim()}` : '');
      const textValue = (key: string) => {
        const value = input[key];
        return typeof value === 'string' ? value : '';
      };
      for (const key of flags) input[key] = boolean(textValue(key));
      for (const key of ['latitude', 'longitude'])
        input[key] = textValue(key).trim() ? Number(textValue(key)) : null;
      for (const key of ['phone_1', 'phone_2', 'email', 'website', 'source_url'])
        if (!input[key]) input[key] = null;
      if (typeof input.website === 'string' && !/^[a-z][a-z0-9+.-]*:/i.test(input.website))
        input.website = 'https://' + input.website;
      for (const key of ['cashless_schemes', 'specialties'])
        input[key] = textValue(key)
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean);
      if (row.is_verified?.trim()) {
        boolean(row.is_verified.trim());
        ignoredVerificationFlags++;
      }
      const value = hospitalInput.parse(input);
      if (keys.has(value.source_key)) throw new Error('Duplicate source_key in this file.');
      keys.add(value.source_key);
      valid.push({ row: index + 2, value });
    } catch (error) {
      errors.push({
        row: index + 2,
        message: error instanceof Error ? error.message : 'Invalid hospital row.',
      });
    }
  });
  return { rows: valid, errors, totalRows: rows.length, ignoredVerificationFlags };
}
