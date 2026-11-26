"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diseaseDelete = exports.diseaseAdminQuery = exports.diseaseQuery = exports.diseaseUpdate = exports.diseaseInput = void 0;
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const editable = zod_1.z
    .object({
    name_en: zod_1.z.string().trim().min(1).max(160),
    name_hi: zod_1.z.string().trim().max(160),
    description_en: zod_1.z.string().trim().max(4000),
    description_hi: zod_1.z.string().trim().max(4000),
    department_id: zod_1.z.uuid(),
    is_active: zod_1.z.boolean(),
})
    .strict();
exports.diseaseInput = editable.extend({
    record_key: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/).default(node_crypto_1.randomUUID),
    name_hi: editable.shape.name_hi.default(''),
    description_en: editable.shape.description_en.default(''),
    description_hi: editable.shape.description_hi.default(''),
    is_active: editable.shape.is_active.default(false),
});
exports.diseaseUpdate = editable
    .partial()
    .extend({ expectedVersion: zod_1.z.number().int().positive() })
    .refine((value) => Object.keys(value).some((key) => key !== 'expectedVersion'), 'Supply a field to update.');
exports.diseaseQuery = zod_1.z
    .object({
    search: zod_1.z.string().trim().max(150).default(''),
    language: zod_1.z.enum(['en', 'hi']).default('en'),
    department_id: zod_1.z.uuid().optional(),
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(30),
})
    .strict();
exports.diseaseAdminQuery = exports.diseaseQuery.extend({
    status: zod_1.z.enum(['all', 'active', 'inactive']).default('all'),
});
exports.diseaseDelete = zod_1.z
    .object({ expected_version: zod_1.z.coerce.number().int().positive() })
    .strict();
//# sourceMappingURL=diseases.input.js.map