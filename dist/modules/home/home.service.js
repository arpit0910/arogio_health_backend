"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../database/database.service");
const schema_1 = require("../../database/schema");
const stormglass_weather_1 = require("./stormglass.weather");
let HomeService = class HomeService {
    database;
    config;
    stormglass;
    cache = new Map();
    constructor(database, config, stormglass) {
        this.database = database;
        this.config = config;
        this.stormglass = stormglass;
    }
    async banners() {
        return this.database.db
            .select({
            id: schema_1.banners.id,
            title: schema_1.banners.title,
            alt: schema_1.banners.alt,
            route: schema_1.banners.route,
            updatedAt: schema_1.banners.updatedAt,
        })
            .from(schema_1.banners)
            .where((0, drizzle_orm_1.eq)(schema_1.banners.published, true))
            .orderBy(schema_1.banners.sortOrder, schema_1.banners.createdAt)
            .limit(10);
    }
    async image(id) {
        const [row] = await this.database.db
            .select({ image: schema_1.banners.image })
            .from(schema_1.banners)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.banners.id, id), (0, drizzle_orm_1.eq)(schema_1.banners.published, true)))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException();
        return row;
    }
    async weather(userId) {
        const [user] = await this.database.db
            .select({ profile: schema_1.users.profileSetup })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        const city = typeof user?.profile?.location === 'string' ? user.profile.location.trim().slice(0, 100) : '';
        const key = this.config.get('OPENWEATHER_API_KEY');
        if (!city)
            return { available: false, city: null, reason: 'missing-city' };
        if (this.config.get('STORMGLASS_API_KEY'))
            return this.stormglass.weather(city);
        if (!key)
            return { available: false, city, reason: 'provider-not-configured' };
        const cacheKey = city.toLowerCase(), saved = this.cache.get(cacheKey);
        if (saved && Date.now() - saved.at < 15 * 60000)
            return saved.value;
        try {
            const geoUrl = new URL('https://api.openweathermap.org/geo/1.0/direct');
            geoUrl.search = new URLSearchParams({ q: city, limit: '1', appid: key }).toString();
            const geoResponse = await fetch(geoUrl, { signal: AbortSignal.timeout(7000) });
            if (!geoResponse.ok)
                throw new Error('Weather lookup unavailable');
            const [location] = zod_1.z
                .array(zod_1.z.object({ name: zod_1.z.string(), lat: zod_1.z.number(), lon: zod_1.z.number() }))
                .parse(await geoResponse.json());
            if (!location)
                return { available: false, city, reason: 'city-not-found' };
            const weatherUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
            weatherUrl.search = new URLSearchParams({
                lat: String(location.lat),
                lon: String(location.lon),
                units: 'metric',
                appid: key,
            }).toString();
            const response = await fetch(weatherUrl, { signal: AbortSignal.timeout(7000) });
            if (!response.ok)
                throw new Error('Weather unavailable');
            const body = zod_1.z
                .object({
                main: zod_1.z.object({ temp: zod_1.z.number().finite() }),
                weather: zod_1.z.array(zod_1.z.object({ main: zod_1.z.string() })),
                dt: zod_1.z.number(),
            })
                .parse(await response.json());
            const value = {
                available: true,
                city: location.name,
                temperature: Math.round(body.main.temp),
                condition: body.weather[0]?.main ?? 'Weather',
                observedAt: new Date(body.dt * 1000).toISOString(),
            };
            if (this.cache.size >= 500)
                this.cache.delete(this.cache.keys().next().value);
            this.cache.set(cacheKey, { at: Date.now(), value });
            return value;
        }
        catch {
            return { available: false, city, reason: 'provider-unavailable' };
        }
    }
};
exports.HomeService = HomeService;
exports.HomeService = HomeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        config_1.ConfigService,
        stormglass_weather_1.StormglassWeather])
], HomeService);
//# sourceMappingURL=home.service.js.map