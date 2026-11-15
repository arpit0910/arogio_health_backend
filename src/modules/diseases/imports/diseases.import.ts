import { parseCsv } from '../../health-resources/imports/csv';
import { workbookToCsv } from '../../health-resources/imports/workbook';
import { diseaseInput, type DiseaseInput } from '../requests/diseases.input';
export const diseaseHeaders = [
  'source_key',
  'name_en',
  'name_hi',
  'description_en',
  'description_hi',
  'department_source_key',
  'is_active',
];
export type DepartmentReference = { id: string; source_key: string; name_en: string };
export async function prepareDiseases(
  file: Express.Multer.File | undefined,
  departments: DepartmentReference[],
) {
  if (!file?.buffer.length || file.buffer.length > 8 * 1024 * 1024)
    throw new Error('Choose a CSV or XLSX file up to 8 MB.');
  const extension = file.originalname.toLowerCase().split('.').pop();
  if (!['csv', 'xlsx'].includes(extension ?? '')) throw new Error('Use a .csv or .xlsx file.');
  const rows = parseCsv(extension === 'xlsx' ? await workbookToCsv(file.buffer) : file.buffer),
    headers = Object.keys(rows[0]!);
  if (
    !headers.includes('name_en') ||
    (!headers.includes('source_key') && !headers.includes('id')) ||
    headers.some(
      (key) =>
        ![
          ...diseaseHeaders,
          'id',
          'department_id',
          'department_name_en',
          'department_name_hi',
        ].includes(key),
    )
  )
    throw new Error('Use disease template headers. Symptoms are not part of this module.');
  const valid: { row: number; value: DiseaseInput }[] = [],
    errors: { row: number; message: string }[] = [],
    keys = new Set<string>(),
    names = new Set<string>();
  rows.forEach((row, index) => {
    try {
      if (row.source_key?.trim() && row.id?.trim())
        throw new Error('Supply source_key or legacy id, not both.');
      const references: DepartmentReference[] = [];
      for (const [key, kind] of [
        ['department_source_key', 'source'],
        ['department_id', 'id'],
        ['department_name_en', 'name'],
      ] as const) {
        const value = row[key]?.trim();
        if (!value) continue;
        const found = departments.find((department) =>
          kind === 'source'
            ? department.source_key === value
            : kind === 'name'
              ? department.name_en.trim().toLowerCase() === value.toLowerCase()
              : department.id === value ||
                (/^\d{1,20}$/.test(value) && department.source_key === `swasthya:${value}`),
        );
        if (!found)
          throw new Error('Department reference not found. Import or select the department first.');
        references.push(found);
      }
      if (!references.length || new Set(references.map((value) => value.id)).size !== 1)
        throw new Error('Supply one unambiguous existing department reference.');
      const active = row.is_active?.trim().toLowerCase() ?? '';
      if (!['', '0', '1', 'true', 'false'].includes(active))
        throw new Error('is_active must be 1/0 or true/false.');
      const value = diseaseInput.parse({
        source_key:
          row.source_key?.trim() ||
          (/^\d{1,20}$/.test(row.id?.trim() ?? '') ? `swasthya:disease:${row.id!.trim()}` : ''),
        name_en: row.name_en,
        name_hi: row.name_hi ?? '',
        description_en: row.description_en ?? '',
        description_hi: row.description_hi ?? '',
        department_id: references[0]!.id,
        is_active: ['1', 'true'].includes(active),
      });
      if (keys.has(value.source_key) || names.has(value.name_en.toLowerCase()))
        throw new Error('Duplicate source key or disease name in this file.');
      keys.add(value.source_key);
      names.add(value.name_en.toLowerCase());
      valid.push({ row: index + 2, value });
    } catch (error) {
      errors.push({
        row: index + 2,
        message: error instanceof Error ? error.message : 'Invalid disease row.',
      });
    }
  });
  return { rows: valid, errors, totalRows: rows.length };
}
