"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correctionInput = exports.reviewInput = exports.careInput = exports.careQuery = exports.careKind = void 0;
const review_input_1 = require("../../../common/directory/review-input");
const zod_1 = require("zod");
exports.careKind = zod_1.z.enum(['hospital', 'doctor', 'medicine', 'lab', 'pharmacy']);
const line = zod_1.z.string().trim().max(300);
exports.careQuery = zod_1.z
    .object({
    search: zod_1.z.string().trim().max(150).default(''),
    kind: exports.careKind.optional(),
    city: line.default('Jaipur'),
    specialty: line.default(''),
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
})
    .strict();
exports.careInput = zod_1.z
    .object({
    recordKey: line.min(1).optional(),
    kind: exports.careKind,
    name: line.min(1),
    nameHi: line.default(''),
    city: zod_1.z.literal('Jaipur').default('Jaipur'),
    address: zod_1.z.string().trim().max(2000).default(''),
    addressHi: zod_1.z.string().trim().max(2000).default(''),
    phone: zod_1.z
        .string()
        .regex(/^\+?[\d ()-]{6,25}$/)
        .refine((value) => /^\+?\d{6,15}$/.test(value.replace(/[ ()-]/g, '')), 'Use 6 to 15 actual telephone digits.')
        .nullable()
        .default(null),
    details: zod_1.z
        .object({
        specialties: zod_1.z.array(line.min(1)).max(30).default([]),
        qualifications: line.default(''),
        registration: line.default(''),
        languages: zod_1.z.array(line).max(20).default([]),
        providerType: line.default(''),
        summary: zod_1.z.string().trim().max(15000).default(''),
        precautions: zod_1.z.string().trim().max(15000).default(''),
        latitude: zod_1.z.number().min(-90).max(90).nullable().default(null),
        longitude: zod_1.z.number().min(-180).max(180).nullable().default(null),
    })
        .strict()
        .refine((d) => (d.latitude == null) === (d.longitude == null), 'Supply both coordinates or neither.'),
    expectedUpdatedAt: zod_1.z.iso.datetime().optional(),
})
    .strict();
exports.reviewInput = zod_1.z
    .object({
    expectedUpdatedAt: zod_1.z.iso.datetime(),
    publish: zod_1.z.boolean(),
    ...review_input_1.directoryReviewFields,
})
    .strict()
    .refine(review_input_1.hasReviewConfirmation, 'Confirm the listing details before continuing.');
exports.correctionInput = zod_1.z.object({ message: zod_1.z.string().trim().min(10).max(1000) }).strict();
//# sourceMappingURL=care-directory.input.js.map