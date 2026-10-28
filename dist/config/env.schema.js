"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
const zod_1 = require("zod");
const booleanFromString = zod_1.z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true');
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: zod_1.z.url().refine((value) => value.startsWith('postgresql://'), {
        message: 'DATABASE_URL must use postgresql://',
    }),
    DATABASE_POOL_MAX: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    DATABASE_IDLE_TIMEOUT_MS: zod_1.z.coerce.number().int().min(1_000).default(30_000),
    CORS_ORIGINS: zod_1.z
        .string()
        .min(1)
        .transform((value) => value.split(',').map((origin) => origin.trim()))
        .refine((origins) => origins.every((origin) => URL.canParse(origin)), {
        message: 'CORS_ORIGINS must contain comma-separated absolute origins',
    }),
    JWT_ISSUER: zod_1.z.string().min(1).default('arogio-api'),
    JWT_AUDIENCE: zod_1.z.string().min(1).default('arogio-clients'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: zod_1.z.coerce.number().int().min(60).max(3_600).default(900),
    REFRESH_TOKEN_TTL_DAYS: zod_1.z.coerce.number().int().min(1).max(90).default(30),
    GOOGLE_CLIENT_IDS: zod_1.z
        .string()
        .min(1)
        .transform((value) => value
        .split(',')
        .map((clientId) => clientId.trim())
        .filter(Boolean))
        .refine((ids) => ids.length > 0 &&
        ids.every((id) => /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.apps\.googleusercontent\.com$/.test(id)), {
        message: 'GOOGLE_CLIENT_IDS must contain comma-separated Google OAuth client IDs, not secrets, JSON or quoted values.',
    }),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    SWAGGER_ENABLED: booleanFromString,
});
function validateEnvironment(config) {
    const result = envSchema.safeParse(config);
    if (!result.success) {
        throw new Error(`Invalid environment configuration: ${zod_1.z.prettifyError(result.error)}`);
    }
    return result.data;
}
//# sourceMappingURL=env.schema.js.map