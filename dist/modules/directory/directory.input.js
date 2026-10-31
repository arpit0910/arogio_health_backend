"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearbyInput = exports.listInput = exports.bankInput = exports.articleInput = exports.bloodGroups = void 0;
const zod_1 = require("zod");
exports.bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const line = zod_1.z.string().trim().max(300), optional = zod_1.z.string().trim().max(1000).nullable().default(null);
exports.articleInput = zod_1.z
    .object({
    title_en: line.min(1),
    title_hi: line.default(''),
    excerpt_en: zod_1.z.string().trim().max(2000).default(''),
    excerpt_hi: zod_1.z.string().trim().max(2000).default(''),
    content_en: zod_1.z.string().trim().min(1).max(100000),
    content_hi: zod_1.z.string().trim().max(100000).default(''),
    category: line.min(1),
    author_name: line.default(''),
    is_published: zod_1.z.boolean().default(false),
})
    .strict();
exports.bankInput = zod_1.z
    .object({
    name_en: line.min(1),
    name_hi: line.default(''),
    city: line.min(1),
    state: line.min(1),
    pincode: optional,
    landmark: optional,
    address_en: zod_1.z.string().trim().min(1).max(2000),
    address_hi: zod_1.z.string().trim().max(2000).default(''),
    country_code: zod_1.z
        .string()
        .regex(/^\+\d{1,4}$/)
        .default('+91'),
    phone: optional,
    emergency_country_code: zod_1.z
        .string()
        .regex(/^\+\d{1,4}$/)
        .default('+91'),
    emergency_phone: optional,
    email: zod_1.z.email().max(300).nullable().default(null),
    website: zod_1.z
        .url()
        .max(1000)
        .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Use an http or https website')
        .nullable()
        .default(null),
    is_verified: zod_1.z.boolean().default(false),
    is_24_7: zod_1.z.boolean().default(false),
    is_government: zod_1.z.boolean().default(false),
    component_facility: zod_1.z.boolean().default(false),
    apheresis_facility: zod_1.z.boolean().default(false),
    available_blood_groups: zod_1.z.array(zod_1.z.enum(exports.bloodGroups)).max(8).default([]),
    latitude: zod_1.z.number().finite().min(-90).max(90).nullable().default(null),
    longitude: zod_1.z.number().finite().min(-180).max(180).nullable().default(null),
    is_active: zod_1.z.boolean().default(true),
})
    .strict()
    .refine((value) => (value.latitude == null) === (value.longitude == null), 'Provide both latitude and longitude, or leave both empty');
exports.listInput = zod_1.z
    .object({
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().max(150).default(''),
    category: zod_1.z.string().trim().max(300).optional(),
    bloodGroup: zod_1.z.enum(exports.bloodGroups).optional(),
    only24h: zod_1.z.enum(['true', 'false']).optional(),
})
    .strict();
exports.nearbyInput = zod_1.z
    .object({
    latitude: zod_1.z.number().finite().min(-90).max(90),
    longitude: zod_1.z.number().finite().min(-180).max(180),
    radiusKm: zod_1.z.number().finite().min(1).max(500).default(50),
    page: zod_1.z.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(25),
    bloodGroup: zod_1.z.enum(exports.bloodGroups).optional(),
    only24h: zod_1.z.boolean().default(false),
})
    .strict();
//# sourceMappingURL=directory.input.js.map