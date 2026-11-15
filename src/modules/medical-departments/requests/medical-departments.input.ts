import { z } from 'zod';

export const departmentInput = z
  .object({
    source_key: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/),
    name_en: z.string().trim().min(1).max(160),
    name_hi: z.string().trim().max(160).default(''),
    description_en: z.string().trim().max(4000).default(''),
    description_hi: z.string().trim().max(4000).default(''),
    is_active: z.boolean().default(false),
  })
  .strict();
export const departmentUpdate = z
  .object({
    name_en: z.string().trim().min(1).max(160),
    name_hi: z.string().trim().max(160),
    description_en: z.string().trim().max(4000),
    description_hi: z.string().trim().max(4000),
    is_active: z.boolean(),
  })
  .strict()
  .partial()
  .extend({
    expectedVersion: z.number().int().positive(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'expectedVersion'),
    'Supply a field to update.',
  );
export const departmentQuery = z
  .object({
    search: z.string().trim().max(150).default(''),
    language: z.enum(['en', 'hi']).default('en'),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
export const departmentAdminQuery = departmentQuery.extend({
  status: z.enum(['all', 'active', 'inactive']).default('all'),
});
export const departmentDelete = z
  .object({ expected_version: z.coerce.number().int().positive() })
  .strict();
export type DepartmentInput = z.infer<typeof departmentInput>;
