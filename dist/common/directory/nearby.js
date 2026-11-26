"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearbyLocationInput = void 0;
exports.nearbyDirectory = nearbyDirectory;
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
exports.nearbyLocationInput = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    radiusKm: zod_1.z.number().min(1).max(500).default(50),
}).strict();
function nearbyDirectory(latitude, longitude, origin) {
    const earthRadiusKm = 6371;
    const latitudeDelta = origin.radiusKm / earthRadiusKm * 180 / Math.PI;
    const distance = (0, drizzle_orm_1.sql) `(${earthRadiusKm}::double precision * 2 * asin(sqrt(least(1.0, greatest(0.0,
    power(sin(radians(${latitude} - ${origin.latitude}) / 2), 2)
    + cos(radians(${origin.latitude}::double precision)) * cos(radians(${latitude}))
      * power(sin(radians(${longitude} - ${origin.longitude}) / 2), 2)
  )))))`.mapWith(Number);
    return {
        distance,
        withinRadius: (0, drizzle_orm_1.and)((0, drizzle_orm_1.between)(latitude, origin.latitude - latitudeDelta, origin.latitude + latitudeDelta), (0, drizzle_orm_1.isNotNull)(longitude), (0, drizzle_orm_1.lte)(distance, origin.radiusKm)),
    };
}
//# sourceMappingURL=nearby.js.map