import { z } from 'zod';
const editable = z
  .object({
    name_en: z.string().trim().min(1).max(160),
    name_hi: z.string().trim().max(160),
    description_en: z.string().trim().max(4000),
    description_hi: z.string().trim().max(4000),
    department_id: z.uuid(),
    is_active: z.boolean(),
  })
  .strict();
export const diseaseInput = editable.extend({
  source_key: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/),
  name_hi: editable.shape.name_hi.default(''),
  description_en: editable.shape.description_en.default(''),
  description_hi: editable.shape.description_hi.default(''),
  is_active: editable.shape.is_active.default(false),
});
export const diseaseUpdate = editable
  .partial()
  .extend({ expectedVersion: z.number().int().positive() })
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'expectedVersion'),
    'Supply a field to update.',
  );
export const diseaseQuery = z
  .object({
    search: z.string().trim().max(150).default(''),
    language: z.enum(['en', 'hi']).default('en'),
    department_id: z.uuid().optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
export const diseaseAdminQuery = diseaseQuery.extend({
  status: z.enum(['all', 'active', 'inactive']).default('all'),
});
export const diseaseDelete = z
  .object({ expected_version: z.coerce.number().int().positive() })
  .strict();
export type DiseaseInput = z.infer<typeof diseaseInput>;
