import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';

describe('application API', () => {
  let app: NestExpressApplication;
  const database = { ping: jest.fn(), onApplicationShutdown: jest.fn() };
  const auth = {
    register: jest.fn(),
    login: jest.fn(),
    googleLogin: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
  const users = { getMe: jest.fn(), updateMe: jest.fn(), saveSetup: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .overrideProvider(AuthService)
      .useValue(auth)
      .overrideProvider(UsersService)
      .useValue(users)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('serves the status homepage and CSP-compatible assets outside the API prefix', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('content-type', /text\/html/)
      .expect('cache-control', 'no-store')
      .expect('x-arogio-service', 'arogio-health-api')
      .expect(({ text, headers }) => {
        expect(text).toContain('Arogio backend status');
        expect(text).toContain('/status-assets/status.js');
        expect(headers['content-security-policy']).toContain("script-src 'self'");
      });
    await request(app.getHttpServer()).get('/status-assets/status.js').expect(200);
    await request(app.getHttpServer()).get('/status-assets/status.css').expect(200);
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('tracks rejected API calls without exposing request data or counting monitor polling', async () => {
    const initial = await request(app.getHttpServer()).get('/api/v1/diagnostics').expect(200);
    await request(app.getHttpServer()).get('/api/v1/diagnostics').expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/users/me?privateQuery=do-not-publish')
      .set('authorization', 'Bearer private-token-do-not-publish')
      .set('x-request-id', 'private-request-id-do-not-publish')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'private-email-do-not-publish', password: 'private-password-do-not-publish' })
      .expect(400);
    await request(app.getHttpServer()).get('/api/v1/private-path-do-not-publish').expect(404);
    await request(app.getHttpServer()).get('/api/v1/diagnostics/ping').expect(200);
    const result = await request(app.getHttpServer()).get('/api/v1/diagnostics').expect(200);
    expect(result.body.counts.apiRequests).toBe(initial.body.counts.apiRequests + 3);
    expect(result.body.counts.clientErrors).toBe(initial.body.counts.clientErrors + 3);
    expect(result.body.counts.probes).toBe(initial.body.counts.probes + 1);
    expect(result.body.recent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'GET',
          route: '/api/v1/users/me',
          status: 401,
          kind: 'api',
        }),
        expect.objectContaining({ method: 'POST', route: '/api/v1/auth/login', status: 400 }),
        expect.objectContaining({ route: '(unmatched API route)', status: 404 }),
        expect.objectContaining({ route: '/api/v1/diagnostics/ping', kind: 'probe' }),
      ]),
    );
    expect(JSON.stringify(result.body)).not.toContain('do-not-publish');
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it('bounds retained traffic and treats trailing-slash health calls as probes', async () => {
    const initial = await request(app.getHttpServer()).get('/api/v1/diagnostics').expect(200);
    for (let index = 0; index < 55; index += 1) {
      await request(app.getHttpServer()).get('/api/v1/health/').expect(200);
    }
    const result = await request(app.getHttpServer()).get('/api/v1/diagnostics/').expect(200);
    expect(result.body.recent).toHaveLength(50);
    expect(result.body.counts.apiRequests).toBe(initial.body.counts.apiRequests);
    expect(result.body.counts.probes).toBe(initial.body.counts.probes + 55);
    const recent = result.body.recent as { kind: string }[];
    expect(recent.every((event) => event.kind === 'probe')).toBe(true);
  });

  it('separates liveness from database readiness', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });
    expect(database.ping).not.toHaveBeenCalled();

    database.ping.mockResolvedValueOnce(undefined);
    await request(app.getHttpServer())
      .get('/api/v1/ready')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 'ready', checks: { database: 'up' } });
      });
  });

  it('does not expose database errors through readiness', async () => {
    database.ping.mockRejectedValueOnce(new Error('password=secret internal-host'));
    await request(app.getHttpServer())
      .get('/api/v1/ready')
      .expect(503)
      .expect(({ body, headers }) => {
        expect(body.error.code).toBe('SERVICE_NOT_READY');
        expect(JSON.stringify(body)).not.toContain('internal-host');
        expect(body.error.requestId).toBe(headers['x-request-id']);
      });
  });

  it('rejects malformed registration before calling the service', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'invalid', password: 'weak', unexpected: true })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe('VALIDATION_FAILED');
        expect(body.error.details).toHaveProperty('email');
        expect(body.error.details).toHaveProperty('password');
        expect(body.error.details).toHaveProperty('unexpected');
      });
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('normalizes valid registration input at the API boundary', async () => {
    auth.register.mockResolvedValueOnce({ ok: true });
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: '  USER@Example.COM ',
        password: 'SecurePassword1',
        fullName: '  Arogio User  ',
        heightValue: '68',
        heightUnit: 'in',
        weightValue: '150.8',
        weightUnit: 'lb',
      })
      .expect(201);
    expect(auth.register).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'SecurePassword1',
      fullName: 'Arogio User',
      heightValue: 68,
      heightUnit: 'in',
      weightValue: 150.8,
      weightUnit: 'lb',
    });
  });

  it('rejects unsafe health measurements before calling the registration service', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'user@example.com',
        password: 'SecurePassword1',
        heightValue: 19,
        heightUnit: 'in',
        weightValue: 1103,
        weightUnit: 'lb',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe('VALIDATION_FAILED');
        expect(body.error.details).toHaveProperty('heightValue');
        expect(body.error.details).toHaveProperty('weightValue');
      });
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('rejects an unsupported measurement unit before calling the registration service', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'user@example.com',
        password: 'SecurePassword1',
        heightValue: 68,
        heightUnit: 'feet',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe('VALIDATION_FAILED');
        expect(body.error.details).toHaveProperty('heightUnit');
      });
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('requires an access token for the current-user API', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('accepts a valid access token and passes its subject to the user flow', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const jwt = app.get(JwtService);
    const accessToken = await jwt.signAsync({
      sub: userId,
      sid: '22222222-2222-4222-8222-222222222222',
    });
    users.getMe.mockResolvedValueOnce({ id: userId, email: 'user@example.com' });

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe(userId));
    expect(users.getMe).toHaveBeenCalledWith(userId);
  });

  it('protects profile setup and validates setup choices at the API boundary', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/setup')
      .send({ step: 1 })
      .expect(401);
    const jwt = app.get(JwtService);
    const token = await jwt.signAsync({
      sub: '11111111-1111-4111-8111-111111111111',
      sid: '22222222-2222-4222-8222-222222222222',
    });
    for (const payload of [
      { activityLevel: 'invalid' },
      { healthGoals: ['invalid'] },
      { healthGoals: ['improve_sleep', 'improve_sleep'] },
      { step: 8 },
      { healthReminders: 'true' },
      { dateOfBirth: null },
      { heightValue: null, heightUnit: 'cm' },
      { weightValue: null, weightUnit: 'kg' },
      { profileCompletedAt: '2026-01-01' },
    ]) {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/setup')
        .set('authorization', `Bearer ${token}`)
        .send(payload)
        .expect(400);
    }
    expect(users.saveSetup).not.toHaveBeenCalled();
    users.saveSetup.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      profileSetup: { step: 1 },
    });
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/setup')
      .set('authorization', `Bearer ${token}`)
      .send({ step: 1 })
      .expect(200);
    expect(users.saveSetup).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', {
      step: 1,
    });
  });
});
