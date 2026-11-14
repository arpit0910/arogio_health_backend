import { z } from 'zod';
export declare const careKind: z.ZodEnum<{
    hospital: "hospital";
    doctor: "doctor";
    medicine: "medicine";
    lab: "lab";
    pharmacy: "pharmacy";
}>;
export declare const careQuery: z.ZodObject<{
    search: z.ZodDefault<z.ZodString>;
    kind: z.ZodOptional<z.ZodEnum<{
        hospital: "hospital";
        doctor: "doctor";
        medicine: "medicine";
        lab: "lab";
        pharmacy: "pharmacy";
    }>>;
    city: z.ZodDefault<z.ZodString>;
    specialty: z.ZodDefault<z.ZodString>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>;
export declare const careInput: z.ZodObject<{
    sourceKey: z.ZodString;
    kind: z.ZodEnum<{
        hospital: "hospital";
        doctor: "doctor";
        medicine: "medicine";
        lab: "lab";
        pharmacy: "pharmacy";
    }>;
    name: z.ZodString;
    nameHi: z.ZodDefault<z.ZodString>;
    city: z.ZodDefault<z.ZodLiteral<"Jaipur">>;
    address: z.ZodDefault<z.ZodString>;
    addressHi: z.ZodDefault<z.ZodString>;
    phone: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    sourceUrl: z.ZodURL;
    details: z.ZodObject<{
        specialties: z.ZodDefault<z.ZodArray<z.ZodString>>;
        qualifications: z.ZodDefault<z.ZodString>;
        registration: z.ZodDefault<z.ZodString>;
        languages: z.ZodDefault<z.ZodArray<z.ZodString>>;
        providerType: z.ZodDefault<z.ZodString>;
        summary: z.ZodDefault<z.ZodString>;
        precautions: z.ZodDefault<z.ZodString>;
        latitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strict>;
    expectedUpdatedAt: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const reviewInput: z.ZodObject<{
    expectedUpdatedAt: z.ZodISODateTime;
    evidence: z.ZodString;
    reviewerName: z.ZodString;
    reviewerQualification: z.ZodString;
    publish: z.ZodBoolean;
    confirmedSource: z.ZodLiteral<true>;
}, z.core.$strict>;
export declare const correctionInput: z.ZodObject<{
    message: z.ZodString;
}, z.core.$strict>;
