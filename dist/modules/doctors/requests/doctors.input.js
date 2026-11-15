"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorDelete = exports.doctorReview = exports.doctorAdminQuery = exports.doctorQuery = exports.doctorUpdate = exports.doctorInput = exports.doctorFields = exports.doctorAffiliation = void 0;
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
exports.doctorAffiliation = zod_1.z
    .object({
    hospital_id: zod_1.z.uuid(),
    role: line.optional().default(''),
    consultation_mode: zod_1.z.enum(['in_person', 'online', 'hybrid']).default('in_person'),
    availability: line.optional().default(''),
    days_of_week: zod_1.z
        .array(zod_1.z.number().int().min(0).max(6))
        .max(7)
        .default([])
        .refine((v) => new Set(v).size === v.length, 'Duplicate weekdays.'),
    start_time: zod_1.z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .nullable()
        .default(null),
    end_time: zod_1.z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .nullable()
        .default(null),
    consultation_fee: zod_1.z.number().min(0).max(10000000).nullable().default(null),
})
    .strict()
    .refine((v) => (v.start_time === null && v.end_time === null) ||
    (v.start_time !== null &&
        v.end_time !== null &&
        v.start_time < v.end_time &&
        v.days_of_week.length > 0), 'Supply weekdays and a valid start/end time together.');
exports.doctorFields = zod_1.z
    .object({
    name_en: line.min(1),
    name_hi: line.optional(),
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
    registration_number: line.optional(),
    medical_council: line.optional(),
    qualifications: zod_1.z.array(line.min(1)).max(30).optional(),
    languages: zod_1.z.array(line.min(1)).max(30).optional(),
    experience_years: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    consultation_fee: zod_1.z.number().min(0).max(10000000).nullable().optional(),
    department_ids: zod_1.z
        .array(zod_1.z.uuid())
        .max(30)
        .refine((v) => new Set(v).size === v.length, 'Duplicate departments.')
        .optional(),
    affiliations: zod_1.z
        .array(exports.doctorAffiliation)
        .max(30)
        .refine((v) => new Set(v.map((a) => a.hospital_id)).size === v.length, 'Duplicate hospital affiliations.')
        .optional(),
    summary_en: paragraph.optional(),
    summary_hi: paragraph.optional(),
})
    .strict();
const hospitals_input_1 = require("../../hospitals/requests/hospitals.input");
exports.doctorInput = exports.doctorFields
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
    registration_number: '',
    medical_council: '',
    qualifications: [],
    languages: [],
    experience_years: null,
    consultation_fee: null,
    department_ids: [],
    affiliations: [],
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
            (0, hospitals_input_1.hospitalPhone)(value[`country_code_${n}`], value[`phone_${n}`]);
        }
        catch (error) {
            context.addIssue({
                code: 'custom',
                message: error.message,
                path: [`phone_${n}`],
            });
        }
});
exports.doctorUpdate = exports.doctorFields
    .partial()
    .extend({ expectedVersion: zod_1.z.number().int().positive() })
    .refine((value) => Object.keys(value).some((key) => key !== 'expectedVersion'), 'Supply a field to update.');
exports.doctorQuery = zod_1.z
    .object({
    search: zod_1.z.string().trim().max(150).default(''),
    city: line.default(''),
    state: line.default(''),
    department_id: zod_1.z.uuid().optional(),
    hospital_id: zod_1.z.uuid().optional(),
    language: zod_1.z.enum(['en', 'hi']).default('en'),
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
})
    .strict();
exports.doctorAdminQuery = exports.doctorQuery.extend({
    status: zod_1.z.enum(['all', 'published', 'draft']).default('all'),
});
exports.doctorReview = zod_1.z
    .object({
    expectedVersion: zod_1.z.number().int().positive(),
    publish: zod_1.z.boolean(),
    confirmedSource: zod_1.z.literal(true),
    reviewerName: line.min(3),
    reviewerQualification: line.min(3),
    evidence: paragraph.min(20),
})
    .strict();
exports.doctorDelete = zod_1.z
    .object({ expected_version: zod_1.z.coerce.number().int().positive() })
    .strict();
//# sourceMappingURL=doctors.input.js.map