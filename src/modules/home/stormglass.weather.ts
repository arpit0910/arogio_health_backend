import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rename, rmdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const hourSchema = z.object({
  time: z.iso.datetime({ offset: true }),
  airTemperature: z.object({ sg: z.number().finite() }),
  cloudCover: z.object({ sg: z.number().finite() }).optional(),
  precipitation: z.object({ sg: z.number().finite() }).optional(),
});
const entrySchema = z.object({
  name: z.string(), lat: z.number(), lng: z.number(),
  retryAfter: z.number().default(0),
  hours: z.array(hourSchema),
});
const stateSchema = z.object({
  calls: z.array(z.number()),
  cities: z.record(z.string(), entrySchema),
});
type State = z.infer<typeof stateSchema>;
type Entry = z.infer<typeof entrySchema>;
const DAY = 86400000;

/** All workers must share this durable directory. No key is written to cache. */
@Injectable()
export class StormglassWeather {
  constructor(private readonly config: ConfigService) {}

  private async load(file: string): Promise<State> {
    try { return stateSchema.parse(JSON.parse(await readFile(file, 'utf8'))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { calls: [], cities: {} };
      // Corrupt or unreadable usage must not reset the request allowance.
      throw error;
    }
  }
  private async save(file: string, state: State) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
    await rename(temporary, file);
  }
  private reading(entry: Entry | undefined, now: number) {
    const hour = entry?.hours.find(item => {
      const time = Date.parse(item.time);
      return time <= now && now < time + 3600000;
    });
    if (!entry || !hour) return null;
    return {
      available: true as const, city: entry.name,
      temperature: Math.round(hour.airTemperature.sg),
      condition: (hour.precipitation?.sg ?? 0) > 0.1 ? 'Rain' :
        (hour.cloudCover?.sg ?? 100) < 20 ? 'Clear' : 'Cloudy',
      observedAt: hour.time, forecast: true, provider: 'Stormglass',
    };
  }
  async weather(city: string) {
    const key = this.config.get<string>('STORMGLASS_API_KEY');
    if (!key) return { available: false as const, city, reason: 'provider-not-configured' };
    const directory = resolve(this.config.get<string>('WEATHER_CACHE_DIR') || '.local/weather');
    const file = join(directory, 'stormglass.json'), lock = join(directory, 'request.lock');
    const cityKey = city.trim().toLowerCase();
    let locked = false;
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const cached = this.reading((await this.load(file)).cities[cityKey], Date.now());
      if (cached) return cached;
      // Atomic filesystem lock prevents different Node workers spending twice.
      // Fail closed on abandoned locks rather than risking quota overspend.
      try { await mkdir(lock); locked = true; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return { available: false as const, city, reason: 'refresh-in-progress' };
        throw error;
      }
      const state = await this.load(file), now = Date.now();
      const existing = state.cities[cityKey], fresh = this.reading(existing, now);
      if (fresh) return fresh;
      state.calls = state.calls.filter(time => time > now - DAY);
      if (state.calls.length >= 10) return { available: false as const, city, reason: 'daily-limit' };
      if (existing && existing.retryAfter > now) return { available: false as const, city, reason: 'provider-unavailable' };
      let location = existing;
      if (!location) {
        const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
        url.search = new URLSearchParams({ name: city, count: '1', language: 'en' }).toString();
        const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
        if (!response.ok) throw new Error('City lookup unavailable');
        const body = z.object({ results: z.array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number() })).optional() }).parse(await response.json());
        const found = body.results?.[0];
        if (!found) return { available: false as const, city, reason: 'city-not-found' };
        location = { name: found.name, lat: found.latitude, lng: found.longitude, hours: [], retryAfter: 0 };
      }
      // Reserve and persist BEFORE sending, including failed provider requests.
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
      if (!response.ok) throw new Error('Weather provider unavailable');
      const body = z.object({ hours: z.array(hourSchema) }).parse(await response.json());
      location.hours = body.hours;
      await this.save(file, state);
      return this.reading(location, now) ?? { available: false as const, city, reason: 'provider-unavailable' };
    } catch { return { available: false as const, city, reason: 'provider-unavailable' }; }
    finally { if (locked) await rmdir(lock); }
  }
}
