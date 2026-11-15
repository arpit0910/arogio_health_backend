"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentHeaders = void 0;
exports.prepareDepartments = prepareDepartments;
const medical_departments_input_1 = require("../requests/medical-departments.input");
const csv_1 = require("../../health-resources/imports/csv");
const workbook_1 = require("../../health-resources/imports/workbook");
exports.departmentHeaders = [
    'source_key',
    'name_en',
    'name_hi',
    'description_en',
    'description_hi',
    'is_active',
];
async function prepareDepartments(file) {
    if (!file?.buffer?.length || file.buffer.length > 8 * 1024 * 1024)
        throw new Error('Choose a CSV or XLSX file up to 8 MB.');
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx'].includes(extension ?? ''))
        throw new Error('Use a .csv or .xlsx file.');
    const rows = (0, csv_1.parseCsv)(extension === 'xlsx' ? await (0, workbook_1.workbookToCsv)(file.buffer) : file.buffer);
    const headers = Object.keys(rows[0]);
    if (!headers.includes('name_en') ||
        (!headers.includes('source_key') && !headers.includes('id')) ||
        headers.some((header) => ![...exports.departmentHeaders, 'id'].includes(header)))
        throw new Error('Use the department template headers, or legacy id with name_en and optional bilingual fields.');
    const valid = [], errors = [];
    const keys = new Set(), names = new Set();
    rows.forEach((row, index) => {
        try {
            if (row.source_key?.trim() && row.id?.trim())
                throw new Error('Supply source_key or legacy id, not both.');
            const source = row.source_key?.trim() ||
                (/^\d{1,20}$/.test(row.id?.trim() ?? '') ? `swasthya:${row.id.trim()}` : '');
            const active = row.is_active?.trim().toLowerCase() ?? '';
            if (!['', '0', '1', 'true', 'false'].includes(active))
                throw new Error('is_active must be 1/0 or true/false. Blank means inactive.');
            const value = medical_departments_input_1.departmentInput.parse({
                source_key: source,
                name_en: row.name_en,
                name_hi: row.name_hi ?? '',
                description_en: row.description_en ?? '',
                description_hi: row.description_hi ?? '',
                is_active: ['1', 'true'].includes(active),
            });
            const name = value.name_en.toLowerCase();
            if (keys.has(value.source_key))
                throw new Error('Duplicate source_key in this file.');
            if (names.has(name))
                throw new Error('Duplicate English department name in this file.');
            keys.add(value.source_key);
            names.add(name);
            valid.push({ row: index + 2, value });
        }
        catch (error) {
            errors.push({
                row: index + 2,
                message: error instanceof Error ? error.message : 'Invalid department row.',
            });
        }
    });
    return { rows: valid, errors, totalRows: rows.length };
}
//# sourceMappingURL=medical-departments.import.js.map