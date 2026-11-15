import { z } from 'zod';
import type { Response } from 'express';
export declare const providerImageInput: z.ZodObject<{
    expectedVersion: z.ZodCoercedNumber<unknown>;
    alt: z.ZodString;
}, z.core.$strict>;
export declare function decodeProviderImage(file?: Express.Multer.File): Promise<Buffer<ArrayBuffer>>;
export declare function omitProviderImage<T extends {
    image_data: unknown;
}>(row: T): Omit<T, "image_data">;
export declare function sendProviderImage(response: Response, image: {
    image_data: Buffer | null;
    image_revision: string | null;
}): void;
