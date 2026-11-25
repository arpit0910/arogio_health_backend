import { and, between, isNotNull, lte, sql, type SQLWrapper } from 'drizzle-orm';
import { z } from 'zod';

export const nearbyLocationInput = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(500).default(50),
}).strict();
export type NearbyLocation = z.infer<typeof nearbyLocationInput>;

export function nearbyDirectory(latitude: SQLWrapper, longitude: SQLWrapper, origin: NearbyLocation) {
  const earthRadiusKm = 6371;
  const latitudeDelta = origin.radiusKm / earthRadiusKm * 180 / Math.PI;
  const distance = sql<number>`(${earthRadiusKm}::double precision * 2 * asin(sqrt(least(1.0, greatest(0.0,
    power(sin(radians(${latitude} - ${origin.latitude}) / 2), 2)
    + cos(radians(${origin.latitude}::double precision)) * cos(radians(${latitude}))
      * power(sin(radians(${longitude} - ${origin.longitude}) / 2), 2)
  )))))`.mapWith(Number);
  return {
    distance,
    withinRadius: and(
      between(latitude, origin.latitude - latitudeDelta, origin.latitude + latitudeDelta),
      isNotNull(longitude),
      lte(distance, origin.radiusKm),
    )!,
  };
}
