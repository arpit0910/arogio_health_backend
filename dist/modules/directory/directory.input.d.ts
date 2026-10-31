import { z } from 'zod';
export declare const bloodGroups: readonly ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
export declare const articleInput: z.ZodObject<{
    title_en: z.ZodString;
    title_hi: z.ZodDefault<z.ZodString>;
    excerpt_en: z.ZodDefault<z.ZodString>;
    excerpt_hi: z.ZodDefault<z.ZodString>;
    content_en: z.ZodString;
    content_hi: z.ZodDefault<z.ZodString>;
    category: z.ZodString;
    author_name: z.ZodDefault<z.ZodString>;
    is_published: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare const bankInput: z.ZodObject<{
    name_en: z.ZodString;
    name_hi: z.ZodDefault<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    pincode: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    landmark: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    address_en: z.ZodString;
    address_hi: z.ZodDefault<z.ZodString>;
    country_code: z.ZodDefault<z.ZodString>;
    phone: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    emergency_country_code: z.ZodDefault<z.ZodString>;
    emergency_phone: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    email: z.ZodDefault<z.ZodNullable<z.ZodEmail>>;
    website: z.ZodDefault<z.ZodNullable<z.ZodURL>>;
    is_verified: z.ZodDefault<z.ZodBoolean>;
    is_24_7: z.ZodDefault<z.ZodBoolean>;
    is_government: z.ZodDefault<z.ZodBoolean>;
    component_facility: z.ZodDefault<z.ZodBoolean>;
    apheresis_facility: z.ZodDefault<z.ZodBoolean>;
    available_blood_groups: z.ZodDefault<z.ZodArray<z.ZodEnum<{
        "A+": "A+";
        "A-": "A-";
        "B+": "B+";
        "B-": "B-";
        "O+": "O+";
        "O-": "O-";
        "AB+": "AB+";
        "AB-": "AB-";
    }>>>;
    latitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare const listInput: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    search: z.ZodDefault<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    bloodGroup: z.ZodOptional<z.ZodEnum<{
        "A+": "A+";
        "A-": "A-";
        "B+": "B+";
        "B-": "B-";
        "O+": "O+";
        "O-": "O-";
        "AB+": "AB+";
        "AB-": "AB-";
    }>>;
    only24h: z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>;
}, z.core.$strict>;
export declare const nearbyInput: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    radiusKm: z.ZodDefault<z.ZodNumber>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    bloodGroup: z.ZodOptional<z.ZodEnum<{
        "A+": "A+";
        "A-": "A-";
        "B+": "B+";
        "B-": "B-";
        "O+": "O+";
        "O-": "O-";
        "AB+": "AB+";
        "AB-": "AB-";
    }>>;
    only24h: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export type DirectoryKind = 'articles' | 'blood-banks';
export type ArticleInput = z.infer<typeof articleInput>;
export type BankInput = z.infer<typeof bankInput>;
