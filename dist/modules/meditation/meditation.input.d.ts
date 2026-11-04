import { z } from 'zod';
export declare function youtubeVideoId(value: string): string | null;
export declare const meditationInput: z.ZodObject<{
    kind: z.ZodEnum<{
        video: "video";
        practice: "practice";
    }>;
    section: z.ZodEnum<{
        affirmations: "affirmations";
        meditation: "meditation";
        breathing: "breathing";
        grounding: "grounding";
    }>;
    title_en: z.ZodString;
    title_hi: z.ZodDefault<z.ZodString>;
    description_en: z.ZodDefault<z.ZodString>;
    description_hi: z.ZodDefault<z.ZodString>;
    preparation_en: z.ZodDefault<z.ZodString>;
    preparation_hi: z.ZodDefault<z.ZodString>;
    author: z.ZodDefault<z.ZodString>;
    youtubeUrl: z.ZodDefault<z.ZodString>;
    durationSeconds: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title_en: z.ZodString;
        title_hi: z.ZodDefault<z.ZodString>;
        instruction_en: z.ZodString;
        instruction_hi: z.ZodDefault<z.ZodString>;
        seconds: z.ZodNumber;
    }, z.core.$strict>>>;
    repeat: z.ZodDefault<z.ZodNumber>;
    published: z.ZodDefault<z.ZodBoolean>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
    expectedUpdatedAt: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const meditationListInput: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    search: z.ZodDefault<z.ZodString>;
    section: z.ZodOptional<z.ZodEnum<{
        affirmations: "affirmations";
        meditation: "meditation";
        breathing: "breathing";
        grounding: "grounding";
    }>>;
    kind: z.ZodOptional<z.ZodEnum<{
        video: "video";
        practice: "practice";
    }>>;
}, z.core.$strip>;
