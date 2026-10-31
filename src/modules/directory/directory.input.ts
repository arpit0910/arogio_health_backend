import { z } from 'zod';
export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
const line = z.string().trim().max(300),
  optional = z.string().trim().max(1000).nullable().default(null);
export const articleInput = z
  .object({
    title_en: line.min(1),
    title_hi: line.default(''),
    excerpt_en: z.string().trim().max(2000).default(''),
    excerpt_hi: z.string().trim().max(2000).default(''),
    content_en: z.string().trim().min(1).max(100000),
    content_hi: z.string().trim().max(100000).default(''),
    category: line.min(1),
    author_name: line.default(''),
    is_published: z.boolean().default(false),
  })
  .strict();
export const bankInput = z
  .object({
    name_en: line.min(1),
    name_hi: line.default(''),
    city: line.min(1),
    state: line.min(1),
    pincode: optional,
    landmark: optional,
    address_en: z.string().trim().min(1).max(2000),
    address_hi: z.string().trim().max(2000).default(''),
    country_code: z
      .string()
      .regex(/^\+\d{1,4}$/)
      .default('+91'),
    phone: optional,
    emergency_country_code: z
      .string()
      .regex(/^\+\d{1,4}$/)
      .default('+91'),
    emergency_phone: optional,
    email: z.email().max(300).nullable().default(null),
    website: z
      .url()
      .max(1000)
      .refine(
        (value) => ['http:', 'https:'].includes(new URL(value).protocol),
        'Use an http or https website',
      )
      .nullable()
      .default(null),
    is_verified: z.boolean().default(false),
    is_24_7: z.boolean().default(false),
    is_government: z.boolean().default(false),
    component_facility: z.boolean().default(false),
    apheresis_facility: z.boolean().default(false),
    available_blood_groups: z.array(z.enum(bloodGroups)).max(8).default([]),
    latitude: z.number().finite().min(-90).max(90).nullable().default(null),
    longitude: z.number().finite().min(-180).max(180).nullable().default(null),
    is_active: z.boolean().default(true),
  })
  .strict()
  .refine(
    (value) => (value.latitude == null) === (value.longitude == null),
    'Provide both latitude and longitude, or leave both empty',
  );
export const listInput = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(150).default(''),
    category: z.string().trim().max(300).optional(),
    bloodGroup: z.enum(bloodGroups).optional(),
    only24h: z.enum(['true', 'false']).optional(),
  })
  .strict();
export const nearbyInput = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    radiusKm: z.number().finite().min(1).max(500).default(50),
    page: z.number().int().min(1).max(10000).default(1),
    limit: z.number().int().min(1).max(100).default(25),
    bloodGroup: z.enum(bloodGroups).optional(),
    only24h: z.boolean().default(false),
  })
  .strict();
export type DirectoryKind = 'articles' | 'blood-banks';
export type ArticleInput = z.infer<typeof articleInput>;
export type BankInput = z.infer<typeof bankInput>;
