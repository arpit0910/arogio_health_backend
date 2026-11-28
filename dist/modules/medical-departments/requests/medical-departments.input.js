"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentDelete = exports.departmentAdminQuery = exports.departmentQuery = exports.departmentUpdate = exports.departmentInput = void 0;
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
exports.departmentInput = zod_1.z
    .object({
    record_key: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/).default(node_crypto_1.randomUUID),
    name_en: zod_1.z.string().trim().min(1).max(160),
    name_hi: zod_1.z.string().trim().max(160).default(''),
    description_en: zod_1.z.string().trim().max(4000).default(''),
    description_hi: zod_1.z.string().trim().max(4000).default(''),
    is_active: zod_1.z.boolean().default(false),
})
    .strict();
exports.departmentUpdate = zod_1.z
    .object({
    name_en: zod_1.z.string().trim().min(1).max(160),
    name_hi: zod_1.z.string().trim().max(160),
    description_en: zod_1.z.string().trim().max(4000),
    description_hi: zod_1.z.string().trim().max(4000),
    is_active: zod_1.z.boolean(),
})
    .strict()
    .partial()
    .extend({
    expectedVersion: zod_1.z.number().int().positive(),
})
    .refine((value) => Object.keys(value).some((key) => key !== 'expectedVersion'), 'Supply a field to update.');
exports.departmentQuery = zod_1.z
    .object({
    search: zod_1.z.string().trim().max(150).default(''),
    language: zod_1.z.enum(['en', 'hi']).default('en'),
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
})
    .strict();
exports.departmentAdminQuery = exports.departmentQuery.extend({
    status: zod_1.z.enum(['all', 'active', 'inactive']).default('all'),
});
exports.departmentDelete = zod_1.z
    .object({ expected_version: zod_1.z.coerce.number().int().positive() })
    .strict();
//# sourceMappingURL=medical-departments.input.js.map