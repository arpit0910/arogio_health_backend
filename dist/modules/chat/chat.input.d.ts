import { z } from 'zod';
export declare const chatInput: z.ZodObject<{
    useSavedHealth: z.ZodDefault<z.ZodBoolean>;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<{
            user: "user";
            assistant: "assistant";
        }>;
        content: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
