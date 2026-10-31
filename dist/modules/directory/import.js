"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankHeaders = exports.articleHeaders = void 0;
exports.prepareImport = prepareImport;
const directory_input_1 = require("./directory.input");
const csv_1 = require("./csv");
exports.articleHeaders = [
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
];
exports.bankHeaders = [
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
const nullable = (value) => !value?.trim() || /^(not available|n\/?a|null|none)$/i.test(value.trim()) ? null : value.trim();
function flag(value) {
    if (/^(1|true)$/i.test(value))
        return true;
    if (/^(0|false)$/i.test(value))
        return false;
    throw new Error('Boolean fields must contain 1/0 or true/false.');
}
function timestamp(value) {
    const normalized = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value)
        ? value.replace(' ', 'T') + 'Z'
        : value;
    const date = new Date(normalized);
    if (!Number.isFinite(date.getTime()))
        throw new Error('Invalid article date.');
    return date;
}
function prepareImport(kind, buffer) {
    const rows = (0, csv_1.parseCsv)(buffer), expected = kind === 'articles' ? exports.articleHeaders : exports.bankHeaders;
    const headers = Object.keys(rows[0]);
    const missing = expected.filter((key) => !headers.includes(key)), unknown = headers.filter((key) => !expected.includes(key));
    if (missing.length || unknown.length)
        throw new Error(`Import headers do not match. Missing: ${missing.join(', ') || 'none'}. Unknown: ${unknown.join(', ') || 'none'}.`);
    const articles = [], banks = [], errors = [], seen = new Set();
    rows.forEach((row, index) => {
        try {
            const source_id = (row.id ?? '').trim();
            if (!/^\d{1,20}$/.test(source_id))
                throw new Error('id must be a numeric export ID.');
            if (seen.has(source_id))
                throw new Error('Duplicate id in this file.');
            seen.add(source_id);
            const { id: _id, created_at, updated_at, ...fields } = row;
            void _id;
            if (kind === 'articles') {
                const value = directory_input_1.articleInput.parse({
                    ...fields,
                    content_en: (fields.content_en ?? '').replace(/\\r\\n|\\n/g, '\n'),
                    content_hi: (fields.content_hi ?? '').replace(/\\r\\n|\\n/g, '\n'),
                    is_published: flag(fields.is_published ?? ''),
                });
                articles.push({
                    ...value,
                    source_id,
                    created_at: timestamp(created_at ?? ''),
                    updated_at: timestamp(updated_at ?? ''),
                });
            }
            else {
                const input = { ...fields };
                for (const key of [
                    'is_verified',
                    'is_24_7',
                    'is_government',
                    'component_facility',
                    'apheresis_facility',
                ])
                    input[key] = flag(fields[key] ?? '');
                for (const key of ['phone', 'emergency_phone', 'email', 'website', 'pincode', 'landmark'])
                    input[key] = nullable(fields[key]);
                if (typeof input.website === 'string' && !/^[a-z][a-z\d+.-]*:/i.test(input.website))
                    input.website = `https://${input.website}`;
                input.latitude = nullable(fields.latitude) == null ? null : Number(fields.latitude);
                input.longitude = nullable(fields.longitude) == null ? null : Number(fields.longitude);
                input.available_blood_groups = Array.from(new Set((fields.available_blood_groups ?? '')
                    .split(';')
                    .map((value) => value.trim())
                    .filter(Boolean)));
                banks.push({ ...directory_input_1.bankInput.parse(input), source_id });
            }
        }
        catch (error) {
            errors.push({
                row: index + 2,
                message: error instanceof Error ? error.message.slice(0, 500) : 'Invalid row.',
            });
        }
    });
    return { totalRows: rows.length, articles, banks, errors };
}
//# sourceMappingURL=import.js.map