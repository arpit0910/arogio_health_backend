import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { UsersRepository } from '../modules/users/users.repository';
import { UsersService } from '../modules/users/users.service';
import { AuthRepository } from '../modules/auth/auth.repository';
import type { DatabaseService } from './database.service';
import * as schema from './schema';

describe('database migrations', () => {
  let database: PGlite;

  beforeEach(async () => {
    database = new PGlite();
    const directory = join(process.cwd(), 'drizzle');
    const migrationFiles = (await readdir(directory))
      .filter((name) => name.endsWith('.sql'))
      .sort();
    for (const file of migrationFiles) {
      const sql = await readFile(join(directory, file), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) {
        if (statement.trim()) await database.exec(statement);
      }
    }
  });

  afterEach(async () => database.close());

  it('applies from zero and enforces unique account identifiers', async () => {
    await database.exec(`
      insert into users (id, email) values
      ('11111111-1111-4111-8111-111111111111', 'user@example.com');
    `);
    await expect(
      database.exec(`
        insert into users (id, email) values
        ('22222222-2222-4222-8222-222222222222', 'user@example.com');
      `),
    ).rejects.toThrow();
  });

  it('enforces valid height and weight ranges', async () => {
    await expect(
      database.exec(`
        insert into users (id, email, height_cm, weight_kg) values
        ('11111111-1111-4111-8111-111111111111', 'invalid-health@example.com', 40, 700);
      `),
    ).rejects.toThrow();
    await expect(
      database.exec(`
        insert into users (id, email, height_cm, weight_kg) values
        ('22222222-2222-4222-8222-222222222222', 'valid-health@example.com', 172.5, 68.4);
      `),
    ).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ command: 'INSERT', rowCount: 1 })]),
    );
  });

  it('enforces unique provider subjects and cascades identity/session deletion', async () => {
    await database.exec(`
      insert into users (id, email) values
      ('11111111-1111-4111-8111-111111111111', 'user@example.com');
      insert into auth_identities (user_id, provider, provider_subject)
      values ('11111111-1111-4111-8111-111111111111', 'google', 'google-subject');
      insert into auth_sessions (id, user_id, token_hash, family_id, expires_at)
      values (
        '22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111',
        'token-hash',
        '33333333-3333-4333-8333-333333333333',
        now() + interval '1 day'
      );
      delete from users where id = '11111111-1111-4111-8111-111111111111';
    `);
    const identities = await database.query<{ count: number }>(
      'select count(*)::int as count from auth_identities',
    );
    const sessions = await database.query<{ count: number }>(
      'select count(*)::int as count from auth_sessions',
    );
    expect(identities.rows[0]?.count).toBe(0);
    expect(sessions.rows[0]?.count).toBe(0);
  });

  it('rotates refresh sessions and revokes the token family on reuse', async () => {
    const repository = new AuthRepository({
      db: drizzle(database, { schema }),
    } as unknown as DatabaseService);
    const user = await repository.createPasswordUser({
      email: 'rotation@example.com',
      passwordHash: 'not-returned-to-a-client',
    });
    await repository.createSession({
      id: '11111111-1111-4111-8111-111111111111',
      userId: user.id,
      familyId: '22222222-2222-4222-8222-222222222222',
      tokenHash: 'old-token-hash',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const replacement = {
      id: '33333333-3333-4333-8333-333333333333',
      userId: '44444444-4444-4444-8444-444444444444',
      familyId: '55555555-5555-4555-8555-555555555555',
      tokenHash: 'new-token-hash',
      expiresAt: new Date(Date.now() + 60_000),
    };
    await expect(
      repository.rotateSession({
        currentTokenHash: 'old-token-hash',
        replacement,
        now: new Date(),
      }),
    ).resolves.toMatchObject({ kind: 'rotated', userId: user.id, sessionId: replacement.id });

    await expect(
      repository.rotateSession({
        currentTokenHash: 'old-token-hash',
        replacement: { ...replacement, id: '66666666-6666-4666-8666-666666666666' },
        now: new Date(),
      }),
    ).resolves.toEqual({ kind: 'reused' });

    const active = await database.query<{ count: number }>(
      'select count(*)::int as count from auth_sessions where revoked_at is null',
    );
    expect(active.rows[0]?.count).toBe(0);
  });

  it('returns the winning Google user after a duplicate identity race', async () => {
    const repository = new AuthRepository({
      db: drizzle(database, { schema }),
    } as unknown as DatabaseService);
    const first = await repository.createGoogleUser({
      subject: 'stable-google-subject',
      email: 'google@example.com',
      fullName: 'Google User',
      emailVerified: true,
    });
    const second = await repository.createGoogleUser({
      subject: 'stable-google-subject',
      email: 'google@example.com',
      fullName: 'Google User',
      emailVerified: true,
    });
    expect(second.id).toBe(first.id);
  });

  it('persists setup drafts and completes the profile with normalized measurements', async () => {
    const connection = { db: drizzle(database, { schema }) } as unknown as DatabaseService;
    const auth = new AuthRepository(connection);
    const account = await auth.createPasswordUser({
      email: 'setup@example.com',
      passwordHash: 'private',
    });
    const service = new UsersService(new UsersRepository(connection));
    expect((await service.getMe(account.id)).profileCompletedAt).toBeNull();
    await service.saveSetup(account.id, { step: 1 });
    await service.saveSetup(account.id, {
      dateOfBirth: '2001-03-17',
      weightValue: 70,
      weightUnit: 'kg',
      heightValue: 170,
      heightUnit: 'cm',
      step: 2,
    });
    await service.saveSetup(account.id, { activityLevel: 'lightly_active', step: 3 });
    await service.saveSetup(account.id, {
      healthGoals: ['weight_management', 'fitness_activity'],
      gender: 'female',
      location: 'Mumbai',
      referralSource: 'Friend',
      healthReminders: true,
      tipsAndInsights: true,
      productUpdates: false,
      step: 6,
    });
    const resumed = await service.getMe(account.id);
    expect(resumed.profileSetup).toMatchObject({
      step: 6,
      dateOfBirth: '2001-03-17',
      activityLevel: 'lightly_active',
      productUpdates: false,
    });
    expect(resumed.profileCompletedAt).toBeNull();
    const complete = await service.saveSetup(account.id, { complete: true });
    expect(complete.profileCompletedAt).toBeInstanceOf(Date);
    expect(complete.bmi).toBe(24.2);
    expect(complete.profileSetup?.step).toBe(7);
    expect(complete).not.toHaveProperty('passwordHash');
    const again = await service.getMe(account.id);
    expect(again.profileCompletedAt).toEqual(complete.profileCompletedAt);
    await service.saveSetup(account.id, { complete: true });
    expect((await service.getMe(account.id)).profileCompletedAt).toEqual(
      complete.profileCompletedAt,
    );
  });

  it('rejects premature completion and impossible birth dates without persisting', async () => {
    const connection = { db: drizzle(database, { schema }) } as unknown as DatabaseService;
    const account = await new AuthRepository(connection).createPasswordUser({
      email: 'incomplete@example.com',
      passwordHash: 'private',
    });
    const service = new UsersService(new UsersRepository(connection));
    await expect(service.saveSetup(account.id, { complete: true })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    await expect(
      service.saveSetup(account.id, { dateOfBirth: '2001-02-31' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await service.getMe(account.id)).profileSetup).toBeNull();
  });
});
