import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import * as schema from '../src/database/schema';
import {
  addDays,
  defaultCycleSettings,
  localDay,
  waterDay,
  waterSchedule,
} from '../src/modules/wellness/domain';
describe('Account-owned wellness HTTP journeys', () => {
  let app: NestExpressApplication, database: PGlite, token: string, other: string;
  beforeAll(async () => {
    database = new PGlite();
    for (const name of (await readdir(join(process.cwd(), 'drizzle')))
      .filter((n) => n.endsWith('.sql'))
      .sort())
      for (const sql of (await readFile(join(process.cwd(), 'drizzle', name), 'utf8')).split(
        '--> statement-breakpoint',
      ))
        if (sql.trim()) await database.exec(sql);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({
        db: drizzle(database, { schema }),
        ping: async () => {},
        onApplicationShutdown: async () => {},
      })
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureApplication(app);
    await app.init();
    for (const email of ['wellness@example.com', 'other-wellness@example.com']) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'Health1!', fullName: 'Synthetic Wellness User' })
        .expect(201);
      if (!token) token = response.body.accessToken as string;
      else other = response.body.accessToken as string;
    }
  }, 30000);
  afterAll(async () => {
    await app?.close();
    await database?.close();
  });
  const call = (method: 'get' | 'put' | 'delete', path: string, body?: object, auth?: string) => {
    const agent = request(app.getHttpServer());
    return agent[method]('/api/v1/wellness' + path)
      .auth(auth ?? token, { type: 'bearer' })
      .send(body);
  };
  it('requires authentication and rejects invalid settings or extra properties', async () => {
    await request(app.getHttpServer()).get('/api/v1/wellness').expect(401);
    await call('put', '/water/plan', { wakeTime: '24:00' }).expect(400);
    await call('put', '/cycle/settings', {
      ...defaultCycleSettings('UTC'),
      userId: randomUUID(),
    }).expect(400);
  });
  it('persists plans, deduplicates logs, separates users and enforces task ownership', async () => {
    const body = {
      wakeTime: '07:00',
      sleepTime: '23:00',
      targetMl: 2000,
      servingMl: 250,
      timezone: 'UTC',
      remindersEnabled: true,
      pausedUntil: null,
    };
    const response = await call('put', '/water/plan', body).expect(200);
    const plan = response.body.waterPlan as typeof body & { version: string };
    const unchanged = await call('put', '/water/plan', { ...body, remindersEnabled: false }).expect(
      200,
    );
    expect(unchanged.body.waterPlan.version).toBe(plan.version);
    const id = randomUUID(),
      log = {
        amountMl: 250,
        loggedAt: new Date().toISOString(),
        taskId: waterSchedule(plan, waterDay(plan))[0]!.id,
      };
    const logged = await call('put', `/water/logs/${id}`, log).expect(200);
    expect(logged.body.waterLogs).toHaveLength(1);
    await call('put', `/water/logs/${id}`, log).expect(200);
    const duplicate = await call('put', `/water/logs/${randomUUID()}`, log).expect(200);
    expect(duplicate.body.waterLogs).toHaveLength(1);
    await call('put', `/water/logs/${id}`, { ...log, amountMl: 300 }).expect(409);
    await call('put', `/water/logs/${id}`, log, other).expect(409);
    const isolated = await call('get', '', undefined, other).expect(200);
    expect(isolated.body.waterLogs).toEqual([]);
    expect(isolated.body.waterPlan).toBeNull();
    await call('delete', `/water/logs/${id}`, undefined, other).expect(200);
    expect((await call('get', '').expect(200)).body.waterLogs).toHaveLength(1);
    await call('put', `/water/tasks/${encodeURIComponent('invalid')}`, {
      day: waterDay(plan),
      status: 'skipped',
      snoozedUntil: null,
    }).expect(400);
  });
  it('rejects future/overlapping periods, supports check-ins and deletes features independently', async () => {
    await call('put', '/cycle/settings', defaultCycleSettings('UTC')).expect(200);
    const today = localDay(new Date(), 'UTC'),
      id = randomUUID();
    await call('put', `/cycle/periods/${id}`, {
      startDate: addDays(today, -4),
      endDate: today,
    }).expect(200);
    await call('put', `/cycle/periods/${randomUUID()}`, {
      startDate: addDays(today, -2),
      endDate: null,
    }).expect(409);
    await call('put', `/cycle/periods/${randomUUID()}`, {
      startDate: addDays(today, 1),
      endDate: null,
    }).expect(400);
    await call('put', `/cycle/periods/${randomUUID()}`, {
      startDate: '2026-02-30',
      endDate: null,
    }).expect(400);
    await call('put', `/cycle/entries/${today}`, {
      flow: 'light',
      symptoms: ['cramps'],
      mood: 'calm',
      notes: 'Synthetic private note',
    }).expect(200);
    await call('put', `/cycle/entries/${today}`, {
      flow: 'light',
      symptoms: ['cramps', 'cramps'],
      mood: null,
      notes: '',
    }).expect(400);
    const cleared = await call('delete', '/water/data').expect(200);
    expect(cleared.body.waterPlan).toBeNull();
    expect(cleared.body.waterLogs).toEqual([]);
    expect(cleared.body.periods).toHaveLength(1);
    await call('delete', `/cycle/periods/${id}`, undefined, other).expect(200);
    expect((await call('get', '').expect(200)).body.periods).toHaveLength(1);
    const deleted = await call('delete', '/cycle/data').expect(200);
    expect(deleted.body.cycleSettings).toBeNull();
    expect(deleted.body.periods).toEqual([]);
    expect(deleted.body.cycleEntries).toEqual([]);
  });
});
