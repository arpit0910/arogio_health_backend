"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diseaseHeaders = void 0;
exports.prepareDiseases = prepareDiseases;
const csv_1 = require("../../health-resources/imports/csv");
const workbook_1 = require("../../health-resources/imports/workbook");
const diseases_input_1 = require("../requests/diseases.input");
exports.diseaseHeaders = [
    'record_key',
    'name_en',
    'name_hi',
    'description_en',
    'description_hi',
    'department_record_key',
    'is_active',
];
async function prepareDiseases(file, departments) {
    if (!file?.buffer.length || file.buffer.length > 8 * 1024 * 1024)
        throw new Error('Choose a CSV or XLSX file up to 8 MB.');
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx'].includes(extension ?? ''))
        throw new Error('Use a .csv or .xlsx file.');
    const rows = (0, csv_1.parseCsv)(extension === 'xlsx' ? await (0, workbook_1.workbookToCsv)(file.buffer) : file.buffer), headers = Object.keys(rows[0]);
    if (!headers.includes('name_en') ||
        (!headers.some((key) => ['record_key', 'source_key', 'id'].includes(key))) ||
        headers.some((key) => ![
            ...exports.diseaseHeaders,
            'id',
            'source_key',
            'source_url',
            'source',
            'department_source_key',
            'department_id',
            'department_name_en',
            'department_name_hi',
        ].includes(key)))
        throw new Error('Use disease template headers. Symptoms are not part of this module.');
    const valid = [], errors = [], keys = new Set(), names = new Set();
    rows.forEach((row, index) => {
        try {
            const recordKey = row.record_key?.trim() || row.source_key?.trim();
            if ((row.record_key?.trim() && row.source_key?.trim() && row.record_key.trim() !== row.source_key.trim()) || (recordKey && row.id?.trim()))
                throw new Error('Supply one stable record identifier.');
            const references = [];
            for (const [key, kind] of [
                ['department_record_key', 'key'],
                ['department_source_key', 'key'],
                ['department_id', 'id'],
                ['department_name_en', 'name'],
            ]) {
                const value = row[key]?.trim();
                if (!value)
                    continue;
                const found = departments.find((department) => kind === 'key'
                    ? department.record_key === value
                    : kind === 'name'
                        ? department.name_en.trim().toLowerCase() === value.toLowerCase()
                        : department.id === value ||
                            (/^\d{1,20}$/.test(value) && department.record_key === `swasthya:${value}`));
                if (!found)
                    throw new Error('Department reference not found. Import or select the department first.');
                references.push(found);
            }
            if (!references.length || new Set(references.map((value) => value.id)).size !== 1)
                throw new Error('Supply one unambiguous existing department reference.');
            const active = row.is_active?.trim().toLowerCase() ?? '';
            if (!['', '0', '1', 'true', 'false'].includes(active))
                throw new Error('is_active must be 1/0 or true/false.');
            const value = diseases_input_1.diseaseInput.parse({
                record_key: recordKey ||
                    (/^\d{1,20}$/.test(row.id?.trim() ?? '') ? `swasthya:disease:${row.id.trim()}` : ''),
                name_en: row.name_en,
                name_hi: row.name_hi ?? '',
                description_en: row.description_en ?? '',
                description_hi: row.description_hi ?? '',
                department_id: references[0].id,
                is_active: ['1', 'true'].includes(active),
            });
            if (keys.has(value.record_key) || names.has(value.name_en.toLowerCase()))
                throw new Error('Duplicate record key or disease name in this file.');
            keys.add(value.record_key);
            names.add(value.name_en.toLowerCase());
            valid.push({ row: index + 2, value });
        }
        catch (error) {
            errors.push({
                row: index + 2,
                message: error instanceof Error ? error.message : 'Invalid disease row.',
            });
        }
    });
    return { rows: valid, errors, totalRows: rows.length };
}
//# sourceMappingURL=diseases.import.js.map