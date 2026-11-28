import { generalDirectoryAliases, selectDirectoryColumns } from './directory-columns';
import {
  articleInput,
  bankInput,
  type ArticleInput,
  type BankInput,
  type DirectoryKind,
} from '../requests/health-resources.input';
import { parseCsv } from './csv';
export const articleHeaders = [
  'id',
  'title_en',
  'title_hi',
  'excerpt_en',
  'excerpt_hi',
  'content_en',
  'content_hi',
  'category',
  'author_name',
  'is_published',
  'created_at',
  'updated_at',
  'image_url',
];
export const bankHeaders = [
  'id',
  'name_en',
  'name_hi',
  'city',
  'state',
  'pincode',
  'landmark',
  'address_en',
  'address_hi',
  'country_code',
  'phone',
  'emergency_country_code',
  'emergency_phone',
  'email',
  'website',
  'is_verified',
  'is_24_7',
  'is_government',
  'component_facility',
  'apheresis_facility',
  'available_blood_groups',
  'latitude',
  'longitude',
];
const nullable = (value: string | undefined) =>
  !value?.trim() || /^(not available|n\/?a|null|none)$/i.test(value.trim()) ? null : value.trim();
function flag(value: string) {
  if (/^(1|true)$/i.test(value)) return true;
  if (/^(0|false)$/i.test(value)) return false;
  throw new Error('Boolean fields must contain 1/0 or true/false.');
}
function timestamp(value: string) {
  const normalized = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value)
    ? value.replace(' ', 'T') + 'Z'
    : value;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid article date.');
  return date;
}
type ImportedArticle = ArticleInput & { record_key: string; created_at: Date; updated_at: Date };
type ImportedBank = BankInput & { record_key: string };
export function prepareImport(kind: DirectoryKind, buffer: Buffer) {
  const rawRows = parseCsv(buffer);
  const rows = kind === 'articles'
    ? rawRows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !['source', 'source_url'].includes(key))))
    : selectDirectoryColumns(rawRows, bankHeaders, {
    ...generalDirectoryAliases, import_key: 'id', record_key: 'id', source_key: 'id', source_id: 'id', blood_bank_id: 'id',
    blood_bank_name: 'name_en', address: 'address_en', full_address: 'address_en', phone_number: 'phone',
  });
  const expected = kind === 'articles' ? articleHeaders : bankHeaders;
  const headers = Object.keys(rows[0]!);
  const required = kind === 'articles' ? expected.filter(key => key !== 'image_url') : ['id', 'name_en', 'city', 'state', 'address_en'];
  const missing = required.filter(key => !headers.includes(key)),
    unknown = headers.filter((key) => !expected.includes(key));
  if (missing.length || unknown.length)
    throw new Error(
      `Import headers do not match. Missing: ${missing.join(', ') || 'none'}. Unknown: ${unknown.join(', ') || 'none'}.`,
    );
  const articles: ImportedArticle[] = [],
    banks: ImportedBank[] = [],
    errors: { row: number; message: string }[] = [],
    seen = new Set<string>();
  rows.forEach((row, index) => {
    try {
      const record_key = (row.id ?? '').trim();
      if (!(kind === 'articles' ? /^\d{1,20}$/ : /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/).test(record_key))
        throw new Error('Supply a stable record ID.');
      if (seen.has(record_key)) throw new Error('Duplicate id in this file.');
      seen.add(record_key);
      const { id: _id, created_at, updated_at, ...fields } = row;
      void _id;
      if (kind === 'articles') {
        const value = articleInput.parse({
          ...fields,
          content_en: (fields.content_en ?? '').replace(/\\r\\n|\\n/g, '\n'),
          content_hi: (fields.content_hi ?? '').replace(/\\r\\n|\\n/g, '\n'),
          is_published: flag(fields.is_published ?? ''),
        });
        articles.push({
          ...value,
          record_key,
          created_at: timestamp(created_at ?? ''),
          updated_at: timestamp(updated_at ?? ''),
        });
      } else {
        const input: Record<string, unknown> = { ...fields };
        for (const key of [
          'is_verified',
          'is_24_7',
          'is_government',
          'component_facility',
          'apheresis_facility',
        ])
          input[key] = key === 'is_verified' ? false : fields[key] ? flag(fields[key]) : false;
        for (const key of ['phone', 'emergency_phone', 'email', 'website', 'pincode', 'landmark'])
          input[key] = nullable(fields[key]);
        if (typeof input.website === 'string' && !/^[a-z][a-z\d+.-]*:/i.test(input.website))
          input.website = `https://${input.website}`;
        input.latitude = nullable(fields.latitude) == null ? null : Number(fields.latitude);
        input.longitude = nullable(fields.longitude) == null ? null : Number(fields.longitude);
        input.available_blood_groups = Array.from(
          new Set(
            (fields.available_blood_groups ?? '')
              .split(';')
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        );
        banks.push({ ...bankInput.parse(input), record_key });
      }
    } catch (error) {
      errors.push({
        row: index + 2,
        message: error instanceof Error ? error.message.slice(0, 500) : 'Invalid row.',
      });
    }
  });
  return { totalRows: rows.length, articles, banks, errors };
}
