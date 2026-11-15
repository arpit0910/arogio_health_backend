import { z } from 'zod';

const line = z.string().trim().max(200);
const paragraph = z.string().trim().max(4000);
const https = z
  .url()
  .max(2000)
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  }, 'Use an HTTPS URL without credentials.');
const flag = z.boolean().nullable().optional();
export const hospitalFields = z
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
    pincode: z.string().trim().max(20).optional(),
    country_code_1: z
      .string()
      .trim()
      .regex(/^(\+\d{1,4})?$/)
      .optional(),
    phone_1: z.string().trim().max(30).nullable().optional(),
    country_code_2: z
      .string()
      .trim()
      .regex(/^(\+\d{1,4})?$/)
      .optional(),
    phone_2: z.string().trim().max(30).nullable().optional(),
    email: z.email().max(254).nullable().optional(),
    website: https.nullable().optional(),
    source_url: https.nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    accepts_ayushman: flag,
    accepts_janaadhaar: flag,
    accepts_cghs: flag,
    accepts_esic: flag,
    rgahs_approved: flag,
    is_cashless: flag,
    nabh_accredited: flag,
    is_24_7: flag,
    cashless_schemes: z.array(line.min(1)).max(30).optional(),
    specialties: z.array(line.min(1)).max(50).optional(),
    summary_en: paragraph.optional(),
    summary_hi: paragraph.optional(),
  })
  .strict();

export function hospitalPhone(code: string, phone: string | null) {
  if (!phone) return null;
  const clean = phone.replace(/[ ()-]/g, '');
  const result = clean.startsWith('+') ? clean : code + clean;
  if (!/^\+\d{6,15}$/.test(result))
    throw new Error('Use a full international phone number, or supply its country code.');
  if (clean.startsWith('+') && code && !clean.startsWith(code))
    throw new Error('Phone and country code disagree.');
  return result;
}
export const hospitalInput = hospitalFields
  .extend({
    source_key: z
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
    cashless_schemes: [] as string[],
    specialties: [] as string[],
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
    for (const n of [1, 2] as const)
      try {
        hospitalPhone(value[`country_code_${n}`], value[`phone_${n}`]);
      } catch (error) {
        context.addIssue({
          code: 'custom',
          message: (error as Error).message,
          path: [`phone_${n}`],
        });
      }
  });
export type HospitalInput = z.infer<typeof hospitalInput>;
export const hospitalUpdate = hospitalFields
  .partial()
  .extend({ expectedVersion: z.number().int().positive() })
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'expectedVersion'),
    'Supply a field to update.',
  );
export const hospitalQuery = z
  .object({
    search: z.string().trim().max(150).default(''),
    city: line.default(''),
    state: line.default(''),
    type: line.default(''),
    benefit: z
      .enum(['ayushman', 'janaadhaar', 'cghs', 'esic', 'rgahs', 'cashless', 'nabh'])
      .optional(),
    language: z.enum(['en', 'hi']).default('en'),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export const hospitalAdminQuery = hospitalQuery.extend({
  status: z.enum(['all', 'published', 'draft']).default('all'),
});
export const hospitalReview = z
  .object({
    expectedVersion: z.number().int().positive(),
    publish: z.boolean(),
    confirmedSource: z.literal(true),
    reviewerName: line.min(3),
    reviewerQualification: line.min(3),
    evidence: paragraph.min(20),
  })
  .strict();
export const hospitalDelete = z
  .object({ expected_version: z.coerce.number().int().positive() })
  .strict();
