import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { banners, users } from '../../database/schema';
@Injectable()
export class HomeService {
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
  ) {}
  async banners() {
    return this.database.db
      .select({
        id: banners.id,
        title: banners.title,
        alt: banners.alt,
        route: banners.route,
        updatedAt: banners.updatedAt,
      })
      .from(banners)
      .where(eq(banners.published, true))
      .orderBy(banners.sortOrder, banners.createdAt)
      .limit(10);
  }
  async image(id: string) {
    const [row] = await this.database.db
      .select({ image: banners.image })
      .from(banners)
      .where(and(eq(banners.id, id), eq(banners.published, true)))
      .limit(1);
    if (!row) throw new NotFoundException();
    return row;
  }
  async weather(userId: string) {
    const [user] = await this.database.db
      .select({ profile: users.profileSetup })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const city =
      typeof user?.profile?.location === 'string' ? user.profile.location.trim().slice(0, 100) : '';
    const key = this.config.get<string>('OPENWEATHER_API_KEY');
    if (!city || !key) return { available: false, city: city || null };
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
      if (!location) return { available: false, city };
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
      return { available: false, city };
    }
  }
}
