import { z } from 'zod';
export const careKind = z.enum(['hospital', 'doctor', 'medicine', 'lab', 'pharmacy']);
const line = z.string().trim().max(300);
const https = z
  .url()
  .max(2000)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  }, 'Use an HTTPS source without credentials.');
export const careQuery = z
  .object({
    search: z.string().trim().max(150).default(''),
    kind: careKind.optional(),
    city: line.default('Jaipur'),
    specialty: line.default(''),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export const careInput = z
  .object({
    sourceKey: line.min(1),
    kind: careKind,
    name: line.min(1),
    nameHi: line.default(''),
    city: z.literal('Jaipur').default('Jaipur'),
    address: z.string().trim().max(2000).default(''),
    addressHi: z.string().trim().max(2000).default(''),
    phone: z
      .string()
      .regex(/^\+?[\d ()-]{6,25}$/)
      .refine(
        (value) => /^\+?\d{6,15}$/.test(value.replace(/[ ()-]/g, '')),
        'Use 6 to 15 actual telephone digits.',
      )
      .nullable()
      .default(null),
    sourceUrl: https,
    details: z
      .object({
        specialties: z.array(line.min(1)).max(30).default([]),
        qualifications: line.default(''),
        registration: line.default(''),
        languages: z.array(line).max(20).default([]),
        providerType: line.default(''),
        summary: z.string().trim().max(15000).default(''),
        precautions: z.string().trim().max(15000).default(''),
        latitude: z.number().min(-90).max(90).nullable().default(null),
        longitude: z.number().min(-180).max(180).nullable().default(null),
      })
      .strict()
      .refine(
        (d) => (d.latitude == null) === (d.longitude == null),
        'Supply both coordinates or neither.',
      ),
    expectedUpdatedAt: z.iso.datetime().optional(),
  })
  .strict();
export const reviewInput = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),
    evidence: z.string().trim().min(20).max(4000),
    reviewerName: line.min(3),
    reviewerQualification: line.min(3),
    publish: z.boolean(),
    confirmedSource: z.literal(true),
  })
  .strict();
export const correctionInput = z.object({ message: z.string().trim().min(10).max(1000) }).strict();
