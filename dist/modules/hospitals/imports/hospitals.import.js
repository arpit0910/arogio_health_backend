"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hospitalHeaders = void 0;
exports.prepareHospitals = prepareHospitals;
const directory_columns_1 = require("../../health-resources/imports/directory-columns");
const csv_1 = require("../../health-resources/imports/csv");
const workbook_1 = require("../../health-resources/imports/workbook");
const hospitals_input_1 = require("../requests/hospitals.input");
exports.hospitalHeaders = [
    'record_key',
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
];
const aliases = {
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
function boolean(value) {
    if (!value)
        return null;
    if (/^(1|true)$/i.test(value))
        return true;
    if (/^(0|false)$/i.test(value))
        return false;
    throw new Error('Boolean fields must be 1/0 or true/false; blank means unknown.');
}
async function prepareHospitals(file) {
    if (!file?.buffer.length || file.buffer.length > 8 * 1024 * 1024)
        throw new Error('Choose a CSV or XLSX file up to 8 MB.');
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx'].includes(extension ?? ''))
        throw new Error('Use a .csv or .xlsx file.');
    const rawRows = (0, csv_1.parseCsv)(extension === 'xlsx' ? await (0, workbook_1.workbookToCsv)(file.buffer) : file.buffer);
    const rows = (0, directory_columns_1.selectDirectoryColumns)(rawRows, [...exports.hospitalHeaders, ...Object.keys(aliases), 'id', 'is_verified'], { ...directory_columns_1.generalDirectoryAliases, hospital_id: 'id', hospital_name: 'name_en', full_address: 'address_line1', address: 'address_line1', phone: 'phone_1', telephone: 'phone_1' });
    const headers = Object.keys(rows[0]);
    if (!['name_en', 'city', 'state'].every(key => headers.includes(key)) || !['record_key', 'id'].some(key => headers.includes(key)))
        throw new Error('Supply a name, city, state and stable record ID or import key.');
    const valid = [], errors = [], keys = new Set();
    let ignoredVerificationFlags = 0;
    rows.forEach((row, index) => {
        try {
            const input = {};
            for (const [raw, value] of Object.entries(row)) {
                if (['id', 'is_verified'].includes(raw))
                    continue;
                const key = aliases[raw] ?? raw, text = value.trim();
                if (key in input && text && input[key] !== text)
                    throw new Error(`Conflicting columns for ${key}.`);
                if (!(key in input) || text)
                    input[key] = text;
            }
            if (row.record_key?.trim() && row.id?.trim())
                throw new Error('Supply record_key or legacy id, not both.');
            input.record_key =
                row.record_key?.trim() ||
                    (0, directory_columns_1.directoryImportKey)(row.id?.trim() ?? '', 'hospital');
            const textValue = (key) => {
                const value = input[key];
                return typeof value === 'string' ? value : '';
            };
            for (const key of flags)
                input[key] = boolean(textValue(key));
            for (const key of ['latitude', 'longitude'])
                input[key] = textValue(key).trim() ? Number(textValue(key)) : null;
            for (const key of ['phone_1', 'phone_2', 'email', 'website'])
                if (!input[key])
                    input[key] = null;
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
            const value = hospitals_input_1.hospitalInput.parse(input);
            if (keys.has(value.record_key))
                throw new Error('Duplicate record_key in this file.');
            keys.add(value.record_key);
            valid.push({ row: index + 2, value });
        }
        catch (error) {
            errors.push({
                row: index + 2,
                message: error instanceof Error ? error.message : 'Invalid hospital row.',
            });
        }
    });
    return { rows: valid, errors, totalRows: rows.length, ignoredVerificationFlags };
}
//# sourceMappingURL=hospitals.import.js.map