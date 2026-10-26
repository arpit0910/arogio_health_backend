import { createSign, generateKeyPairSync } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { OAuth2Client } from 'google-auth-library';
import { CertificateFormat } from 'google-auth-library/build/src/auth/oauth2client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import * as schema from '../src/database/schema';

// Only storage transport and Google's fetched certificate set are substituted.
// Controllers, validation, guards, repositories, Argon2, JWT, Google signature
// verification and refresh rotation are the real production implementations.
describe('signup, setup and Google HTTP journeys', () => {
  let app: NestExpressApplication;
  let database: PGlite;
  const signingKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const untrustedKey = generateKeyPairSync('rsa', { modulusLength: 2048 });

  function googleToken(claims: Record<string, unknown> = {}, forged = false): string {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', kid: 'synthetic-test-key' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        aud: 'test-client.apps.googleusercontent.com',
        sub: 'synthetic-google-subject',
        email: 'google-flow@example.com',
        email_verified: true,
        name: 'Synthetic Google User',
        iat: now,
        exp: now + 3600,
        ...claims,
      }),
    ).toString('base64url');
    const input = `${header}.${payload}`;
    const signature = createSign('RSA-SHA256')
      .update(input)
      .sign(forged ? untrustedKey.privateKey : signingKey.privateKey)
      .toString('base64url');
    return `${input}.${signature}`;
  }

  beforeAll(async () => {
    database = new PGlite();
    for (const name of (await readdir(join(process.cwd(), 'drizzle')))
      .filter((n) => n.endsWith('.sql'))
      .sort()) {
      for (const statement of (await readFile(join(process.cwd(), 'drizzle', name), 'utf8')).split(
        '--> statement-breakpoint',
      )) {
        if (statement.trim()) await database.exec(statement);
      }
    }
    jest.spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync').mockResolvedValue({
      certs: {
        'synthetic-test-key': signingKey.publicKey
          .export({ type: 'spki', format: 'pem' })
          .toString(),
      },
      format: CertificateFormat.PEM,
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({
        db: drizzle(database, { schema }),
        ping: async () => {
          await database.query('select 1');
        },
        onApplicationShutdown: async () => {},
      })
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureApplication(app);
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
    await database?.close();
    jest.restoreAllMocks();
  });

  const personal = {
    dateOfBirth: '2001-03-17',
    heightValue: 170,
    heightUnit: 'cm',
    weightValue: 70,
    weightUnit: 'kg',
  };
  const lifestyle = { activityLevel: 'lightly_active' };
  const healthGoals = ['weight_management', 'fitness_activity'];

  async function finishSetup(accessToken: string) {
    const patch = (body: object) =>
      request(app.getHttpServer())
        .patch('/api/v1/users/me/setup')
        .auth(accessToken, { type: 'bearer' })
        .send(body);
    await patch({ step: 1 }).expect(200);
    await patch({ ...personal, step: 2 }).expect(200);
    await patch({ ...lifestyle, step: 3 }).expect(200);
    await patch({ healthGoals, step: 4 }).expect(200);
    await patch({ gender: 'female', location: 'Mumbai', referralSource: 'Friend', step: 5 }).expect(
      200,
    );
    await patch({
      healthReminders: true,
      tipsAndInsights: true,
      productUpdates: false,
      step: 6,
    }).expect(200);
    // Review edit returns to review and must not mark setup complete.
    const edited = await patch({ weightValue: 72, weightUnit: 'kg', step: 6 }).expect(200);
    expect(edited.body.profileCompletedAt).toBeNull();
    const completed = await patch({ complete: true, step: 7 }).expect(200);
    expect(completed.body.profileCompletedAt).toEqual(expect.any(String));
    expect(completed.body.profileSetup).toMatchObject({
      ...lifestyle,
      healthGoals,
      dateOfBirth: personal.dateOfBirth,
      step: 7,
      productUpdates: false,
    });
    expect(completed.body.weightValue).toBe(72);
    expect(completed.body.bmi).toBe(24.9);
    const retry = await patch({ complete: true }).expect(200);
    expect(retry.body.profileCompletedAt).toBe(completed.body.profileCompletedAt);
    return completed.body as { profileCompletedAt: string };
  }

  it('registers, resumes an unfinished profile, reviews, completes, logs in and rotates/logout sessions', async () => {
    await request(app.getHttpServer()).get('/api/v1/ready').expect(200);
    const account = {
      email: ' Full-Flow@Example.com ',
      password: 'Health1!',
      fullName: 'Synthetic Test User',
    };
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(account)
      .expect(201);
    expect(registration.body.user).toMatchObject({
      email: 'full-flow@example.com',
      profileSetup: null,
      profileCompletedAt: null,
    });
    expect(registration.body.user).not.toHaveProperty('passwordHash');
    const initialToken = registration.body.accessToken as string;
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/setup')
      .auth(initialToken, { type: 'bearer' })
      .send({ ...personal, step: 2 })
      .expect(200);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: account.email, password: account.password })
      .expect(200);
    expect(login.body.user.profileSetup).toMatchObject({
      dateOfBirth: personal.dateOfBirth,
      step: 2,
    });
    expect(login.body.user.profileCompletedAt).toBeNull();
    const completed = await finishSetup(login.body.accessToken as string);
    const signedIn = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: account.email, password: account.password })
      .expect(200);
    expect(signedIn.body.user.profileCompletedAt).toBe(completed.profileCompletedAt);
    const renewed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: signedIn.body.refreshToken })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .auth(renewed.body.accessToken as string, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: renewed.body.refreshToken })
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: renewed.body.refreshToken })
      .expect(401);
  });

  it('returns a conflict for duplicate registration and rejects incomplete/invalid setup without saving it', async () => {
    const account = { email: 'duplicate-flow@example.com', password: 'SyntheticPassword123' };
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(account)
      .expect(201);
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(account).expect(409);
    const patch = (body: object) =>
      request(app.getHttpServer())
        .patch('/api/v1/users/me/setup')
        .auth(registration.body.accessToken as string, { type: 'bearer' })
        .send(body);
    for (const body of [
      { complete: true },
      { dateOfBirth: '2001-02-31' },
      { heightValue: 10, heightUnit: 'cm' },
      { healthGoals: ['invalid'] },
      { productUpdates: null },
    ]) {
      await patch(body).expect(400);
    }
    const current = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .auth(registration.body.accessToken as string, { type: 'bearer' })
      .expect(200);
    expect(current.body.profileSetup).toBeNull();
    expect(current.body.profileCompletedAt).toBeNull();
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/setup')
      .send({ step: 1 })
      .expect(401);
    await patch({ id: 'another-user', step: 1 }).expect(400);
  });

  it('verifies a signed Google identity, creates one account, completes setup and restores it on Google sign-in', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: googleToken() })
      .expect(200);
    expect(first.body.user).toMatchObject({
      email: 'google-flow@example.com',
      profileCompletedAt: null,
    });
    const completed = await finishSetup(first.body.accessToken as string);
    const next = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: googleToken() })
      .expect(200);
    expect(next.body.user.id).toBe(first.body.user.id);
    expect(next.body.user.profileCompletedAt).toBe(completed.profileCompletedAt);
    const count = await database.query<{ count: number }>(
      "select count(*)::int as count from auth_identities where provider_subject = 'synthetic-google-subject'",
    );
    expect(count.rows[0]?.count).toBe(1);
  });

  it('rejects Google tokens with the wrong audience, issuer, signature or expiry, and prevents automatic email linking', async () => {
    const now = Math.floor(Date.now() / 1000);
    const invalid = [
      googleToken({ aud: 'wrong-client' }),
      googleToken({ iss: 'https://attacker.example' }),
      googleToken({}, true),
      googleToken({ iat: now - 7200, exp: now - 3600 }),
      'not-a-valid-google-token',
    ];
    for (const idToken of invalid) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ idToken })
        .expect(401);
      expect(response.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
    }
    const existing = { email: 'google-link@example.com', password: 'SyntheticPassword123' };
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(existing).expect(201);
    const conflict = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: googleToken({ sub: 'unlinked-subject', email: existing.email }) })
      .expect(409);
    expect(conflict.body.error.code).toBe('ACCOUNT_LINK_REQUIRED');
  });

  it('passes the release smoke script against a real local HTTP listener', async () => {
    await app.listen(0, '127.0.0.1');
    const baseUrl = `${await app.getUrl()}/api/v1`;
    const result = await promisify(execFile)(process.execPath, ['scripts/smoke-api.mjs', baseUrl]);
    const checks = result.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { pass: boolean });
    expect(checks).toHaveLength(6);
    expect(checks.every((check) => check.pass)).toBe(true);
  });
});
