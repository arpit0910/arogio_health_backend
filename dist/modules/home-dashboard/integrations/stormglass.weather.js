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
exports.StormglassWeather = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const hourSchema = zod_1.z.object({
    time: zod_1.z.iso.datetime({ offset: true }),
    airTemperature: zod_1.z.object({ sg: zod_1.z.number().finite() }),
    cloudCover: zod_1.z.object({ sg: zod_1.z.number().finite() }).optional(),
    precipitation: zod_1.z.object({ sg: zod_1.z.number().finite() }).optional(),
});
const entrySchema = zod_1.z.object({
    name: zod_1.z.string(), lat: zod_1.z.number(), lng: zod_1.z.number(),
    retryAfter: zod_1.z.number().default(0),
    hours: zod_1.z.array(hourSchema),
});
const stateSchema = zod_1.z.object({
    calls: zod_1.z.array(zod_1.z.number()),
    cities: zod_1.z.record(zod_1.z.string(), entrySchema),
});
const DAY = 86400000;
let StormglassWeather = class StormglassWeather {
    config;
    constructor(config) {
        this.config = config;
    }
    async load(file) {
        try {
            return stateSchema.parse(JSON.parse(await (0, promises_1.readFile)(file, 'utf8')));
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return { calls: [], cities: {} };
            throw error;
        }
    }
    async save(file, state) {
        const temporary = `${file}.${(0, node_crypto_1.randomUUID)()}.tmp`;
        await (0, promises_1.writeFile)(temporary, JSON.stringify(state), { mode: 0o600 });
        await (0, promises_1.rename)(temporary, file);
    }
    reading(entry, now) {
        const hour = entry?.hours.find(item => {
            const time = Date.parse(item.time);
            return time <= now && now < time + 3600000;
        });
        if (!entry || !hour)
            return null;
        return {
            available: true, city: entry.name,
            temperature: Math.round(hour.airTemperature.sg),
            condition: (hour.precipitation?.sg ?? 0) > 0.1 ? 'Rain' :
                (hour.cloudCover?.sg ?? 100) < 20 ? 'Clear' : 'Cloudy',
            observedAt: hour.time, forecast: true, provider: 'Stormglass',
        };
    }
    async weather(city) {
        const key = this.config.get('STORMGLASS_API_KEY');
        if (!key)
            return { available: false, city, reason: 'provider-not-configured' };
        const directory = (0, node_path_1.resolve)(this.config.get('WEATHER_CACHE_DIR') || '.local/weather');
        const file = (0, node_path_1.join)(directory, 'stormglass.json'), lock = (0, node_path_1.join)(directory, 'request.lock');
        const cityKey = city.trim().toLowerCase();
        let locked = false;
        try {
            await (0, promises_1.mkdir)(directory, { recursive: true, mode: 0o700 });
            const cached = this.reading((await this.load(file)).cities[cityKey], Date.now());
            if (cached)
                return cached;
            try {
                await (0, promises_1.mkdir)(lock);
                locked = true;
            }
            catch (error) {
                if (error.code === 'EEXIST')
                    return { available: false, city, reason: 'refresh-in-progress' };
                throw error;
            }
            const state = await this.load(file), now = Date.now();
            const existing = state.cities[cityKey], fresh = this.reading(existing, now);
            if (fresh)
                return fresh;
            state.calls = state.calls.filter(time => time > now - DAY);
            if (state.calls.length >= 10)
                return { available: false, city, reason: 'daily-limit' };
            if (existing && existing.retryAfter > now)
                return { available: false, city, reason: 'provider-unavailable' };
            let location = existing;
            if (!location) {
                const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
                url.search = new URLSearchParams({ name: city, count: '1', language: 'en' }).toString();
                const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
                if (!response.ok)
                    throw new Error('City lookup unavailable');
                const body = zod_1.z.object({ results: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), latitude: zod_1.z.number(), longitude: zod_1.z.number() })).optional() }).parse(await response.json());
                const found = body.results?.[0];
                if (!found)
                    return { available: false, city, reason: 'city-not-found' };
                location = { name: found.name, lat: found.latitude, lng: found.longitude, hours: [], retryAfter: 0 };
            }
            state.calls.push(now);
            location.retryAfter = now + 3600000;
            state.cities[cityKey] = location;
            await this.save(file, state);
            const start = Math.floor(now / 3600000) * 3600000;
            const url = new URL('https://api.stormglass.io/v2/weather/point');
            url.search = new URLSearchParams({ lat: String(location.lat), lng: String(location.lng),
                params: 'airTemperature,cloudCover,precipitation', source: 'sg',
                start: new Date(start).toISOString(), end: new Date(start + DAY).toISOString() }).toString();
            const response = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(7000) });
            if (!response.ok)
                throw new Error('Weather provider unavailable');
            const body = zod_1.z.object({ hours: zod_1.z.array(hourSchema) }).parse(await response.json());
            location.hours = body.hours;
            await this.save(file, state);
            return this.reading(location, now) ?? { available: false, city, reason: 'provider-unavailable' };
        }
        catch {
            return { available: false, city, reason: 'provider-unavailable' };
        }
        finally {
            if (locked)
                await (0, promises_1.rmdir)(lock);
        }
    }
};
exports.StormglassWeather = StormglassWeather;
exports.StormglassWeather = StormglassWeather = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StormglassWeather);
//# sourceMappingURL=stormglass.weather.js.map