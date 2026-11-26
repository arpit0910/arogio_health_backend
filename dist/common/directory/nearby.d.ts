import { type SQLWrapper } from 'drizzle-orm';
import { z } from 'zod';
export declare const nearbyLocationInput: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    radiusKm: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>;
export type NearbyLocation = z.infer<typeof nearbyLocationInput>;
export declare function nearbyDirectory(latitude: SQLWrapper, longitude: SQLWrapper, origin: NearbyLocation): {
    distance: import("drizzle-orm").SQL<number>;
    withinRadius: import("drizzle-orm").SQL<unknown>;
};
