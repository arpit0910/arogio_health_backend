import { validateEnvironment } from './env.schema';

const valid = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/arogio',
  CORS_ORIGINS: 'https://arogio.example,https://app.arogio.example',
  JWT_ACCESS_SECRET: 'a-secret-with-more-than-thirty-two-characters',
  GOOGLE_CLIENT_IDS: 'web.apps.googleusercontent.com,mobile.apps.googleusercontent.com',
};

describe('validateEnvironment', () => {
  it('normalizes lists and defaults', () => {
    const environment = validateEnvironment(valid);
    expect(environment.PORT).toBe(3000);
    expect(environment.CORS_ORIGINS).toEqual([
      'https://arogio.example',
      'https://app.arogio.example',
    ]);
    expect(environment.GOOGLE_CLIENT_IDS).toHaveLength(2);
  });

  it('rejects empty, quoted and non-client Google audiences', () => {
    for (const value of [
      ' , ',
      '"web.apps.googleusercontent.com"',
      '{"client_id":"web.apps.googleusercontent.com"}',
      'client-secret',
    ]) {
      expect(() => validateEnvironment({ ...valid, GOOGLE_CLIENT_IDS: value })).toThrow(
        'GOOGLE_CLIENT_IDS',
      );
    }
  });

  it('rejects short secrets and wildcard-like origins', () => {
    expect(() =>
      validateEnvironment({ ...valid, JWT_ACCESS_SECRET: 'short', CORS_ORIGINS: '*' }),
    ).toThrow('Invalid environment configuration');
  });
});
