import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ConfigService } from '@nestjs/config';
import { StormglassWeather } from './stormglass.weather';

describe('Stormglass durable forecast and budget', () => {
  let directory: string;
  let now: number;
  const cityResponse = () => new Response(JSON.stringify({ results: [{ name: 'Jaipur', latitude: 26.9, longitude: 75.8 }] }));
  const forecastResponse = () => new Response(JSON.stringify({ hours: Array.from({ length: 25 }, (_, i) => ({
    time: new Date(Math.floor(now / 3600000) * 3600000 + i * 3600000).toISOString(),
    airTemperature: { sg: 26.2 + i }, cloudCover: { sg: 5 }, precipitation: { sg: 0 },
  })) }));
  const service = () => new StormglassWeather({ get: (key: string) => key === 'STORMGLASS_API_KEY' ? 'fixture-key' : key === 'WEATHER_CACHE_DIR' ? directory : undefined } as unknown as ConfigService);
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'arogio-weather-')); now = Date.now(); });
  afterEach(async () => { jest.restoreAllMocks(); await rm(directory, { recursive: true, force: true }); });
  it('saves a full forecast, reuses it after restart, and advances hours without provider calls', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(cityResponse()).mockResolvedValueOnce(forecastResponse());
    expect(await service().weather('Jaipur')).toMatchObject({ available: true, temperature: 26, forecast: true });
    jest.spyOn(Date, 'now').mockReturnValue(now + 3600000);
    expect(await service().weather('JAIPUR')).toMatchObject({ available: true, temperature: 27 });
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, options] = fetch.mock.calls[1]!;
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).searchParams.get('source')).toBe('sg');
    expect(options?.headers).toEqual({ Authorization: 'fixture-key' });
    expect(await readFile(join(directory, 'stormglass.json'), 'utf8')).not.toContain('fixture-key');
  });
  it('blocks the eleventh attempt across cities and restarts', async () => {
    await writeFile(join(directory, 'stormglass.json'), JSON.stringify({ calls: Array(10).fill(now), cities: {} }));
    const fetch = jest.spyOn(globalThis, 'fetch');
    expect(await service().weather('Another city')).toMatchObject({ available: false, reason: 'daily-limit' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('counts failed requests and backs off instead of spending on every app refresh', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(cityResponse()).mockResolvedValueOnce(new Response('{}', { status: 429 }));
    expect(await service().weather('Jaipur')).toMatchObject({ available: false });
    expect(await service().weather('Jaipur')).toMatchObject({ available: false });
    expect(fetch).toHaveBeenCalledTimes(2);
    const saved = JSON.parse(await readFile(join(directory, 'stormglass.json'), 'utf8')) as { calls: number[] };
    expect(saved.calls).toHaveLength(1);
  });
  it('fails closed on corrupt state and an existing cross-process lock', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    await writeFile(join(directory, 'stormglass.json'), 'corrupt');
    expect(await service().weather('Jaipur')).toMatchObject({ available: false });
    await writeFile(join(directory, 'stormglass.json'), JSON.stringify({ calls: [], cities: {} }));
    await mkdir(join(directory, 'request.lock'));
    expect(await service().weather('Jaipur')).toMatchObject({ available: false, reason: 'refresh-in-progress' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('never shows an expired forecast when the request allowance is exhausted', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(cityResponse()).mockResolvedValueOnce(forecastResponse());
    await service().weather('Jaipur');
    const file = join(directory, 'stormglass.json');
    const saved = JSON.parse(await readFile(file, 'utf8')) as { calls: number[] };
    const later = now + 26 * 3600000;
    saved.calls = Array(10).fill(later);
    await writeFile(file, JSON.stringify(saved));
    jest.spyOn(Date, 'now').mockReturnValue(later);
    expect(await service().weather('Jaipur')).toMatchObject({ available: false, reason: 'daily-limit' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
