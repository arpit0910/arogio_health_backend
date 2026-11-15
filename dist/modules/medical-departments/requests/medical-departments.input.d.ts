import { z } from 'zod';
export declare const departmentInput: z.ZodObject<{
    source_key: z.ZodString;
    name_en: z.ZodString;
    name_hi: z.ZodDefault<z.ZodString>;
    description_en: z.ZodDefault<z.ZodString>;
    description_hi: z.ZodDefault<z.ZodString>;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare const departmentUpdate: z.ZodObject<{
    name_en: z.ZodOptional<z.ZodString>;
    name_hi: z.ZodOptional<z.ZodString>;
    description_en: z.ZodOptional<z.ZodString>;
    description_hi: z.ZodOptional<z.ZodString>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    expectedVersion: z.ZodNumber;
}, z.core.$strict>;
export declare const departmentQuery: z.ZodObject<{
    search: z.ZodDefault<z.ZodString>;
    language: z.ZodDefault<z.ZodEnum<{
        en: "en";
        hi: "hi";
    }>>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>;
export declare const departmentAdminQuery: z.ZodObject<{
    search: z.ZodDefault<z.ZodString>;
    language: z.ZodDefault<z.ZodEnum<{
        en: "en";
        hi: "hi";
    }>>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    status: z.ZodDefault<z.ZodEnum<{
        active: "active";
        all: "all";
        inactive: "inactive";
    }>>;
}, z.core.$strict>;
export declare const departmentDelete: z.ZodObject<{
    expected_version: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export type DepartmentInput = z.infer<typeof departmentInput>;
