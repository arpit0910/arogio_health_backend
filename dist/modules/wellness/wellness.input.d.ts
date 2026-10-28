import { z } from 'zod';
export declare const planInput: z.ZodObject<{
    wakeTime: z.ZodString;
    sleepTime: z.ZodString;
    targetMl: z.ZodNumber;
    servingMl: z.ZodNumber;
    timezone: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    remindersEnabled: z.ZodBoolean;
    pausedUntil: z.ZodNullable<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const cycleInput: z.ZodObject<{
    cycleLength: z.ZodNumber;
    periodLength: z.ZodNumber;
    predictionsEnabled: z.ZodBoolean;
    remindersEnabled: z.ZodBoolean;
    discreet: z.ZodBoolean;
    reminderDaysBefore: z.ZodNumber;
    reminderTime: z.ZodString;
    timezone: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strict>;
export declare const logInput: z.ZodObject<{
    amountMl: z.ZodNumber;
    loggedAt: z.ZodISODateTime;
    taskId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
export declare const taskInput: z.ZodObject<{
    day: z.ZodString;
    status: z.ZodEnum<{
        pending: "pending";
        skipped: "skipped";
    }>;
    snoozedUntil: z.ZodNullable<z.ZodISODateTime>;
}, z.core.$strict>;
export declare const periodInput: z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export declare const entryInput: z.ZodObject<{
    flow: z.ZodEnum<{
        none: "none";
        spotting: "spotting";
        light: "light";
        medium: "medium";
        heavy: "heavy";
    }>;
    symptoms: z.ZodArray<z.ZodEnum<{
        cramps: "cramps";
        bloating: "bloating";
        headache: "headache";
        fatigue: "fatigue";
        back_pain: "back_pain";
        breast_tenderness: "breast_tenderness";
        acne: "acne";
        nausea: "nausea";
    }>>;
    mood: z.ZodNullable<z.ZodEnum<{
        calm: "calm";
        happy: "happy";
        low: "low";
        irritable: "irritable";
        anxious: "anxious";
    }>>;
    notes: z.ZodString;
}, z.core.$strict>;
export declare const medicineInput: z.ZodObject<{
    name: z.ZodString;
    notes: z.ZodString;
    enabled: z.ZodBoolean;
    doses: z.ZodArray<z.ZodObject<{
        time: z.ZodString;
        amount: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
