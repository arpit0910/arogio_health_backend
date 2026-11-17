"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hospitalDelete = exports.hospitalReview = exports.hospitalAdminQuery = exports.hospitalQuery = exports.hospitalUpdate = exports.hospitalInput = exports.hospitalFields = void 0;
exports.hospitalPhone = hospitalPhone;
const admin_status_1 = require("../../../common/directory/admin-status");
const zod_1 = require("zod");
const line = zod_1.z.string().trim().max(200);
const paragraph = zod_1.z.string().trim().max(4000);
const https = zod_1.z
    .url()
    .max(2000)
    .refine((value) => {
    if (!URL.canParse(value))
        return false;
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
}, 'Use an HTTPS URL without credentials.');
const flag = zod_1.z.boolean().nullable().optional();
exports.hospitalFields = zod_1.z
    .object({
    name_en: line.min(1),
    name_hi: line.optional(),
    hospital_type: line.optional(),
    address_line1: paragraph.optional(),
    address_line2: paragraph.optional(),
    landmark: line.optional(),
    address_hi: paragraph.optional(),
    city: line.min(1),
    state: line.min(1),
    pincode: zod_1.z.string().trim().max(20).optional(),
    country_code_1: zod_1.z
        .string()
        .trim()
        .regex(/^(\+\d{1,4})?$/)
        .optional(),
    phone_1: zod_1.z.string().trim().max(30).nullable().optional(),
    country_code_2: zod_1.z
        .string()
        .trim()
        .regex(/^(\+\d{1,4})?$/)
        .optional(),
    phone_2: zod_1.z.string().trim().max(30).nullable().optional(),
    email: zod_1.z.email().max(254).nullable().optional(),
    website: https.nullable().optional(),
    source_url: https.nullable().optional(),
    latitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
    longitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
    accepts_ayushman: flag,
    accepts_janaadhaar: flag,
    accepts_cghs: flag,
    accepts_esic: flag,
    rgahs_approved: flag,
    is_cashless: flag,
    nabh_accredited: flag,
    is_24_7: flag,
    cashless_schemes: zod_1.z.array(line.min(1)).max(30).optional(),
    specialties: zod_1.z.array(line.min(1)).max(50).optional(),
    summary_en: paragraph.optional(),
    summary_hi: paragraph.optional(),
})
    .strict();
function hospitalPhone(code, phone) {
    if (!phone)
        return null;
    const clean = phone.replace(/[ ()-]/g, '');
    const result = clean.startsWith('+') ? clean : code + clean;
    if (!/^\+\d{6,15}$/.test(result))
        throw new Error('Use a full international phone number, or supply its country code.');
    if (clean.startsWith('+') && code && !clean.startsWith(code))
        throw new Error('Phone and country code disagree.');
    return result;
}
exports.hospitalInput = exports.hospitalFields
    .extend({
    source_key: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/),
})
    .transform((value) => ({
    name_hi: '',
    hospital_type: '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    address_hi: '',
    pincode: '',
    country_code_1: '',
    phone_1: null,
    country_code_2: '',
    phone_2: null,
    email: null,
    website: null,
    source_url: null,
    latitude: null,
    longitude: null,
    accepts_ayushman: null,
    accepts_janaadhaar: null,
    accepts_cghs: null,
    accepts_esic: null,
    rgahs_approved: null,
    is_cashless: null,
    nabh_accredited: null,
    is_24_7: null,
    cashless_schemes: [],
    specialties: [],
    summary_en: '',
    summary_hi: '',
    ...value,
}))
    .superRefine((value, context) => {
    if ((value.latitude == null) !== (value.longitude == null))
        context.addIssue({
            code: 'custom',
            message: 'Supply both coordinates or neither.',
            path: ['latitude'],
        });
    for (const n of [1, 2])
        try {
            hospitalPhone(value[`country_code_${n}`], value[`phone_${n}`]);
        }
        catch (error) {
            context.addIssue({
                code: 'custom',
                message: error.message,
                path: [`phone_${n}`],
            });
        }
});
exports.hospitalUpdate = exports.hospitalFields
    .partial()
    .extend({ expectedVersion: zod_1.z.number().int().positive() })
    .refine((value) => Object.keys(value).some((key) => key !== 'expectedVersion'), 'Supply a field to update.');
exports.hospitalQuery = zod_1.z
    .object({
    search: zod_1.z.string().trim().max(150).default(''),
    city: line.default(''),
    state: line.default(''),
    type: line.default(''),
    benefit: zod_1.z
        .enum(['ayushman', 'janaadhaar', 'cghs', 'esic', 'rgahs', 'cashless', 'nabh'])
        .optional(),
    language: zod_1.z.enum(['en', 'hi']).default('en'),
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
})
    .strict();
exports.hospitalAdminQuery = exports.hospitalQuery.extend({
    status: admin_status_1.directoryStatusInput,
});
exports.hospitalReview = zod_1.z
    .object({
    expectedVersion: zod_1.z.number().int().positive(),
    publish: zod_1.z.boolean(),
    confirmedSource: zod_1.z.literal(true),
    reviewerName: line.min(3),
    reviewerQualification: line.min(3),
    evidence: paragraph.min(20),
})
    .strict();
exports.hospitalDelete = zod_1.z
    .object({ expected_version: zod_1.z.coerce.number().int().positive() })
    .strict();
//# sourceMappingURL=hospitals.input.js.map