import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url().refine((value) => value.startsWith('postgresql://'), {
    message: 'DATABASE_URL must use postgresql://',
  }),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(30_000),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .refine((origins) => origins.every((origin) => URL.canParse(origin)), {
      message: 'CORS_ORIGINS must contain comma-separated absolute origins',
    }),
  JWT_ISSUER: z.string().min(1).default('arogio-api'),
  JWT_AUDIENCE: z.string().min(1).default('arogio-clients'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  GOOGLE_CLIENT_IDS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((clientId) => clientId.trim())
        .filter(Boolean),
    )
    .refine(
      (ids) =>
        ids.length > 0 &&
        ids.every((id) =>
          /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.apps\.googleusercontent\.com$/.test(id),
        ),
      {
        message:
          'GOOGLE_CLIENT_IDS must contain comma-separated Google OAuth client IDs, not secrets, JSON or quoted values.',
      },
    ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SWAGGER_ENABLED: booleanFromString,
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
