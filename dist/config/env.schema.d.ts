import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    OPENWEATHER_API_KEY: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        test: "test";
        development: "development";
        production: "production";
    }>>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    DATABASE_URL: z.ZodURL;
    DATABASE_POOL_MAX: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    DATABASE_IDLE_TIMEOUT_MS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    CORS_ORIGINS: z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>;
    JWT_ISSUER: z.ZodDefault<z.ZodString>;
    JWT_AUDIENCE: z.ZodDefault<z.ZodString>;
    JWT_ACCESS_SECRET: z.ZodString;
    JWT_ACCESS_TTL_SECONDS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    REFRESH_TOKEN_TTL_DAYS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    GOOGLE_CLIENT_IDS: z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<{
        error: "error";
        fatal: "fatal";
        warn: "warn";
        info: "info";
        debug: "debug";
        trace: "trace";
    }>>;
    SWAGGER_ENABLED: z.ZodPipe<z.ZodDefault<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>, z.ZodTransform<boolean, "true" | "false">>;
}, z.core.$strip>;
export type Environment = z.infer<typeof envSchema>;
export declare function validateEnvironment(config: Record<string, unknown>): Environment;
export {};
