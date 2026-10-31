import type { ConfigService } from '@nestjs/config';
import type { DatabaseService } from '../../database/database.service';
import { HomeService } from './home.service';
import { StormglassWeather } from './stormglass.weather';
function service(key?: string) {
  const database = {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ profile: { location: 'Jaipur' } }]) }),
        }),
      }),
    },
  } as unknown as DatabaseService;
  const config = { get: (name: string) => name === 'OPENWEATHER_API_KEY' ? key : undefined } as unknown as ConfigService;
  return new HomeService(database, config, new StormglassWeather(config));
}
describe('Home weather', () => {
  afterEach(() => jest.restoreAllMocks());
  it('does not invent weather without a provider key', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    expect(await service().weather('fixture')).toEqual({ available: false, city: 'Jaipur', reason: 'provider-not-configured' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses real provider fields and reuses a short-lived city cache', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: 'Jaipur', lat: 26.9, lon: 75.8 }])),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ main: { temp: 26.2 }, weather: [{ main: 'Clear' }], dt: 1793271600 }),
        ),
      );
    const home = service('fixture-key');
    expect(await home.weather('fixture')).toEqual({
      available: true,
      city: 'Jaipur',
      temperature: 26,
      condition: 'Clear',
      observedAt: new Date(1793271600 * 1000).toISOString(),
    });
    await home.weather('fixture');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('returns an unavailable state on invalid provider data', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ unexpected: true })));
    expect(await service('fixture-key').weather('fixture')).toEqual({
      available: false,
      city: 'Jaipur',
      reason: 'provider-unavailable',
    });
  });
});
