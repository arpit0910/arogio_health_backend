import { z } from 'zod';
export declare const diseaseInput: z.ZodObject<{
    name_en: z.ZodString;
    department_id: z.ZodUUID;
    source_key: z.ZodString;
    name_hi: z.ZodDefault<z.ZodString>;
    description_en: z.ZodDefault<z.ZodString>;
    description_hi: z.ZodDefault<z.ZodString>;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare const diseaseUpdate: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_hi: z.ZodOptional<z.ZodString>;
    description_en: z.ZodOptional<z.ZodString>;
    description_hi: z.ZodOptional<z.ZodString>;
    department_id: z.ZodOptional<z.ZodUUID>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    expectedVersion: z.ZodNumber;
}, z.core.$strict>;
export declare const diseaseQuery: z.ZodObject<{
    search: z.ZodDefault<z.ZodString>;
    language: z.ZodDefault<z.ZodEnum<{
        en: "en";
        hi: "hi";
    }>>;
    department_id: z.ZodOptional<z.ZodUUID>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>;
export declare const diseaseAdminQuery: z.ZodObject<{
    search: z.ZodDefault<z.ZodString>;
    language: z.ZodDefault<z.ZodEnum<{
        en: "en";
        hi: "hi";
    }>>;
    department_id: z.ZodOptional<z.ZodUUID>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    status: z.ZodDefault<z.ZodEnum<{
        active: "active";
        all: "all";
        inactive: "inactive";
    }>>;
}, z.core.$strict>;
export declare const diseaseDelete: z.ZodObject<{
    expected_version: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export type DiseaseInput = z.infer<typeof diseaseInput>;
