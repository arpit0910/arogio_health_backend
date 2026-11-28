import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import { homeBanners, userAccounts } from '../../../database/schema';
import { StormglassWeather } from '../integrations/stormglass.weather';
@Injectable()
export class HomeDashboardService {
  private readonly cache = new Map<
    string,
    {
      at: number;
      value: {
        available: true;
        city: string;
        temperature: number;
        condition: string;
        observedAt: string;
      };
    }
  >();
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly stormglass: StormglassWeather,
  ) {}
  async banners() {
    return this.database.db
      .select({
        id: homeBanners.id,
        title: homeBanners.title,
        alt: homeBanners.alt,
        route: homeBanners.route,
        updatedAt: homeBanners.updatedAt,
      })
      .from(homeBanners)
      .where(eq(homeBanners.published, true))
      .orderBy(homeBanners.sortOrder, homeBanners.createdAt)
      .limit(10);
  }
  async image(id: string) {
    const [row] = await this.database.db
      .select({ image: homeBanners.image })
      .from(homeBanners)
      .where(and(eq(homeBanners.id, id), eq(homeBanners.published, true)))
      .limit(1);
    if (!row) throw new NotFoundException();
    return row;
  }
  async weather(userId: string) {
    const [user] = await this.database.db
      .select({ profile: userAccounts.profileSetup })
      .from(userAccounts)
      .where(eq(userAccounts.id, userId))
      .limit(1);
    const city =
      typeof user?.profile?.location === 'string' ? user.profile.location.trim().slice(0, 100) : '';
    const key = this.config.get<string>('OPENWEATHER_API_KEY');
    if (!city) return { available: false, city: null, reason: 'missing-city' };
    if (this.config.get<string>('STORMGLASS_API_KEY')) return this.stormglass.weather(city);
    if (!key) return { available: false, city, reason: 'provider-not-configured' };
    const cacheKey = city.toLowerCase(),
      saved = this.cache.get(cacheKey);
    if (saved && Date.now() - saved.at < 15 * 60000) return saved.value;
    try {
      const geoUrl = new URL('https://api.openweathermap.org/geo/1.0/direct');
      geoUrl.search = new URLSearchParams({ q: city, limit: '1', appid: key }).toString();
      const geoResponse = await fetch(geoUrl, { signal: AbortSignal.timeout(7000) });
      if (!geoResponse.ok) throw new Error('Weather lookup unavailable');
      const [location] = z
        .array(z.object({ name: z.string(), lat: z.number(), lon: z.number() }))
        .parse(await geoResponse.json());
      if (!location) return { available: false, city, reason: 'city-not-found' };
      const weatherUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
      weatherUrl.search = new URLSearchParams({
        lat: String(location.lat),
        lon: String(location.lon),
        units: 'metric',
        appid: key,
      }).toString();
      const response = await fetch(weatherUrl, { signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error('Weather unavailable');
      const body = z
        .object({
          main: z.object({ temp: z.number().finite() }),
          weather: z.array(z.object({ main: z.string() })),
          dt: z.number(),
        })
        .parse(await response.json());
      const value = {
        available: true as const,
        city: location.name,
        temperature: Math.round(body.main.temp),
        condition: body.weather[0]?.main ?? 'Weather',
        observedAt: new Date(body.dt * 1000).toISOString(),
      };
      if (this.cache.size >= 500) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(cacheKey, { at: Date.now(), value });
      return value;
    } catch {
      return { available: false, city, reason: 'provider-unavailable' };
    }
  }
}
