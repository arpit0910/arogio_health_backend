import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { DatabaseService } from '../src/database/database.service';
import * as schema from '../src/database/schema';

describe('Admin-managed meditation library', () => {
  let app: NestExpressApplication, database: PGlite, token: string, reader: string;
  beforeAll(async () => {
    database = new PGlite();
    for (const name of (await readdir('drizzle')).filter((name) => name.endsWith('.sql')).sort())
      for (const statement of (await readFile(join('drizzle', name), 'utf8')).split(
        '--> statement-breakpoint',
      ))
        if (statement.trim()) await database.exec(statement);
    const db = drizzle(database, { schema });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ db, ping: async () => {}, onApplicationShutdown: async () => {} })
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureApplication(app);
    await app.init();
    const admin = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'meditation-admin@example.test', password: 'Health1!' })
      .expect(201);
    token = admin.body.accessToken as string;
    await db
      .update(schema.users)
      .set({ role: 'super_admin' })
      .where(eq(schema.users.id, admin.body.user.id as string));
    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'meditation-reader@example.test', password: 'Health1!' })
      .expect(201);
    reader = user.body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await database?.close();
  });
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const read = () => ({ Authorization: `Bearer ${reader}` });
  it('protects all admin routes and exposes only published library content to signed-in readers', async () => {
    await request(app.getHttpServer()).get('/api/v1/meditation/content').expect(401);
    await request(app.getHttpServer()).get('/api/v1/admin/meditation').set(read()).expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/admin/meditation')
      .set(read())
      .send({})
      .expect(403);
    const seeded = await request(app.getHttpServer())
      .get('/api/v1/meditation/content')
      .set(read())
      .expect(200);
    expect(seeded.body.items).toHaveLength(6);
    expect(
      (seeded.body.items as { kind: string }[]).filter(
        (row: { kind: string }) => row.kind === 'practice',
      ),
    ).toHaveLength(4);
    expect(
      (seeded.body.items as Record<string, unknown>[]).every(
        (row: Record<string, unknown>) => !('createdBy' in row),
      ),
    ).toBe(true);
    const draft = await request(app.getHttpServer())
      .post('/api/v1/admin/meditation')
      .set(auth())
      .send({
        kind: 'video',
        section: 'affirmations',
        title_en: 'New video',
        youtubeUrl: 'https://youtu.be/s2NISyShKXM?si=example',
        sortOrder: 100,
      })
      .expect(201);
    expect(draft.body).toMatchObject({ videoId: 's2NISyShKXM', published: false });
    const id = draft.body.id as string;
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/meditation/content?search=New%20video')
          .set(read())
          .expect(200)
      ).body.items,
    ).toHaveLength(0);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/meditation/${id}`)
      .set(read())
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/meditation/${id}`)
      .set(read())
      .expect(403);
    const payload = {
      kind: 'video',
      section: 'affirmations',
      title_en: 'New video',
      youtubeUrl: 'https://www.youtube.com/watch?v=s2NISyShKXM',
      published: true,
      sortOrder: 100,
      expectedUpdatedAt: draft.body.updatedAt as string,
    };
    const published = await request(app.getHttpServer())
      .patch(`/api/v1/admin/meditation/${id}`)
      .set(auth())
      .send(payload)
      .expect(200);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/meditation/content?search=New%20video')
          .set(read())
      ).body.items,
    ).toHaveLength(1);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/meditation/${id}`)
      .set(auth())
      .send({ ...payload, expectedUpdatedAt: '2000-01-01T00:00:00.000Z' })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/meditation/${id}`)
      .set(auth())
      .send({ ...payload, expectedUpdatedAt: published.body.updatedAt, published: false })
      .expect(200);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/meditation/content?search=New%20video')
          .set(read())
      ).body.items,
    ).toHaveLength(0);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/meditation/${id}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/admin/meditation/${id}`)
      .set(auth())
      .expect(404);
    const audit = await request(app.getHttpServer())
      .get('/api/v1/admin/audit')
      .set(auth())
      .expect(200);
    expect(
      (audit.body as { action: string; outcome: string }[]).some(
        (row: { action: string; outcome: string }) =>
          row.action === 'meditation.create' && row.outcome === 'succeeded',
      ),
    ).toBe(true);
  });
  it('validates URLs and timed instructions and preserves ordering/pagination', async () => {
    for (const youtubeUrl of [
      'javascript:alert(1)',
      'https://youtube.com.evil.example/watch?v=s2NISyShKXM',
      'https://www.youtube.com/playlist?list=bad',
      'https://user@youtu.be/s2NISyShKXM',
    ])
      await request(app.getHttpServer())
        .post('/api/v1/admin/meditation')
        .set(auth())
        .send({ kind: 'video', section: 'meditation', title_en: 'Bad video', youtubeUrl })
        .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/admin/meditation')
      .set(auth())
      .send({ kind: 'practice', section: 'breathing', title_en: 'Empty practice', steps: [] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/admin/meditation')
      .set(auth())
      .send({
        kind: 'practice',
        section: 'breathing',
        title_en: 'Too long',
        repeat: 60,
        steps: [{ title_en: 'Step', instruction_en: 'Written guidance', seconds: 900 }],
      })
      .expect(400);
    const practice = await request(app.getHttpServer())
      .post('/api/v1/admin/meditation')
      .set(auth())
      .send({
        kind: 'practice',
        section: 'grounding',
        title_en: 'New practice',
        title_hi: 'नया अभ्यास',
        published: true,
        sortOrder: 0,
        repeat: 2,
        durationSeconds: 999,
        steps: [{ title_en: 'Notice', instruction_en: 'Look around you.', seconds: 30 }],
      })
      .expect(201);
    expect(practice.body.durationSeconds).toBe(60);
    const id = practice.body.id as string;
    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/admin/meditation/${id}`)
      .set(auth())
      .expect(200);
    expect(fetched.body.steps[0].title_en).toBe('Notice');
    const first = await request(app.getHttpServer())
      .get('/api/v1/meditation/content?limit=2&page=1')
      .set(read())
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/api/v1/meditation/content?limit=2&page=2')
      .set(read())
      .expect(200);
    expect(first.body.hasNext).toBe(true);
    expect(
      new Set([...first.body.items, ...second.body.items].map((row: { id: string }) => row.id))
        .size,
    ).toBe(4);
    const grounding = await request(app.getHttpServer())
      .get('/api/v1/meditation/content?section=grounding&kind=practice')
      .set(read());
    expect(
      (grounding.body.items as { section: string }[]).every((row) => row.section === 'grounding'),
    ).toBe(true);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/meditation/${id}`)
      .set(auth())
      .expect(200);
    const seed = await request(app.getHttpServer())
      .get('/api/v1/admin/meditation/8e0bc1a0-6ce8-4000-8000-000000000001')
      .set(auth())
      .expect(200);
    const row = seed.body as Record<string, unknown>;
    const fields = Object.fromEntries(
      [
        'kind',
        'section',
        'title_en',
        'title_hi',
        'description_en',
        'description_hi',
        'preparation_en',
        'preparation_hi',
        'author',
        'durationSeconds',
        'steps',
        'repeat',
        'published',
        'sortOrder',
      ].map((key) => [key, row[key]]),
    );
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/meditation/${String(row.id)}`)
      .set(auth())
      .send({ ...fields, youtubeUrl: '', expectedUpdatedAt: row.updatedAt })
      .expect(200);
  });
});
