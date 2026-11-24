import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { configureApplication } from '../src/bootstrap/configure-application';
import * as schema from '../src/database/schema';

const { migrateLocal } = createRequire(__filename)('../scripts/database/migrate-local.cjs') as {
  migrateLocal: (db: PGlite, directory: string) => Promise<void>;
};
describe('Administrator database reset', () => {
  let app: NestExpressApplication,
    database: PGlite,
    token: string,
    ordinary: string,
    refreshToken: string;
  const password = 'Health1!';
  const post = (action: string, body: object, access = token) =>
    request(app.getHttpServer())
      .post(`/api/v1/admin/database-reset/${action}`)
      .set('Authorization', `Bearer ${access}`)
      .send(body);
  const preview = async () =>
    (await post('preview', { password }).expect(201)).body as {
      previewToken: string;
      confirmation: string;
      tables: { name: string; records: string }[];
    };
  beforeAll(async () => {
    database = new PGlite();
    await migrateLocal(database, join(process.cwd(), 'database/migrations'));
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
      .send({ email: 'reset-admin@example.test', password })
      .expect(201);
    token = admin.body.accessToken as string;
    refreshToken = admin.body.refreshToken as string;
    await db
      .update(schema.userAccounts)
      .set({ role: 'super_admin' })
      .where(eq(schema.userAccounts.id, admin.body.user.id as string));
    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'reset-user@example.test', password })
      .expect(201);
    ordinary = user.body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await database?.close();
  });

  it('requires a super-admin and current password; preview does not change records', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/database-reset/preview')
      .send({ password })
      .expect(401);
    await post('preview', { password }, ordinary).expect(403);
    await post('preview', { password: 'wrong' }).expect(401);
    const data = await preview();
    expect(data.tables).toHaveLength(29);
    expect(data.tables.find((t) => t.name === 'user_accounts')?.records).toBe('2');
    expect(JSON.stringify(data)).not.toContain('password_hash');
    const again = await preview();
    expect(again.tables).toEqual(data.tables);
  });
  it('rejects incorrect confirmation, tampering and expired previews without deleting data', async () => {
    const data = await preview();
    await post('apply', {
      password,
      confirmation: 'reset',
      previewToken: data.previewToken,
    }).expect(400);
    await post('apply', {
      password,
      confirmation: data.confirmation,
      previewToken: data.previewToken + 'bad',
    }).expect(400);
    const realNow = Date.now;
    Date.now = () => realNow() + 11 * 60000;
    try {
      await post('apply', {
        password,
        confirmation: data.confirmation,
        previewToken: data.previewToken,
      }).expect(400);
    } finally {
      Date.now = realNow;
    }
    expect((await preview()).tables.find((t) => t.name === 'user_accounts')?.records).toBe('2');
  });
  it('requires a fresh review when counts change', async () => {
    const data = await preview();
    await database.exec("insert into user_accounts (email) values ('changed@example.test')");
    await post('apply', {
      password,
      confirmation: data.confirmation,
      previewToken: data.previewToken,
    }).expect(409);
    expect((await preview()).tables.find((t) => t.name === 'user_accounts')?.records).toBe('3');
  });
  it('refuses unknown tables and rolls back when external foreign keys prevent truncation', async () => {
    await database.exec('create table public.unrecognized_data (id integer)');
    await post('preview', { password }).expect(409);
    await database.exec(
      'drop table public.unrecognized_data; create schema external_data; create table external_data.protected (user_id uuid references public.user_accounts(id));',
    );
    const data = await preview();
    const response = await post('apply', {
      password,
      confirmation: data.confirmation,
      previewToken: data.previewToken,
    });
    expect(response.status).toBe(409);
    expect((await preview()).tables).toEqual(data.tables);
    await database.exec('drop schema external_data cascade');
  });
  it('clears every app table, preserves migrations and invalidates all account sessions', async () => {
    await database.exec(`
      insert into care_directory_entries (record_key, kind, name, city, details)
      values ('reset:hospital', 'hospital', 'Synthetic hospital', 'Delhi', '{}'),
             ('reset:doctor', 'doctor', 'Synthetic doctor', 'Delhi', '{}');
      insert into hospitals (id, record_key, name_en, city, state, image_data)
      select id, record_key, name, city, 'Delhi', decode('abcd','hex') from care_directory_entries where kind = 'hospital';
      insert into doctors (id, record_key, name_en, city, state, image_data)
      select id, record_key, name, city, 'Delhi', decode('abcd','hex') from care_directory_entries where kind = 'doctor';
      insert into medical_departments (record_key, name_en) values ('reset:department', 'Synthetic department');
      insert into medical_diseases (record_key, name_en, department_id)
      select 'reset:disease', 'Synthetic disease', id from medical_departments;
      insert into home_banners (title, alt, image, created_by)
      select 'Synthetic banner', 'Test image', decode('abcd','hex'), id from user_accounts where role = 'super_admin';
    `);
    await database.exec(
      "insert into administration_audit_logs (actor_id, action) select id, 'reset.test' from user_accounts where role = 'super_admin'",
    );
    const journal = await database.query('select * from drizzle.__drizzle_migrations order by id');
    const data = await preview();
    expect(data.tables.find((table) => table.name === 'hospitals')?.records).toBe('1');
    expect(data.tables.find((table) => table.name === 'doctors')?.records).toBe('1');
    await post('apply', {
      password: 'incorrect',
      confirmation: data.confirmation,
      previewToken: data.previewToken,
    }).expect(401);
    const result = await post('apply', {
      password,
      confirmation: data.confirmation,
      previewToken: data.previewToken,
    }).expect(201);
    expect(result.body).toEqual({ reset: true, tableCount: data.tables.length, remainingRecords: 0 });
    expect(data.tables.map((table) => table.name)).toEqual(expect.arrayContaining([
      'health_article_thumbnails', 'wellness_publication_versions', 'wellness_practice_history',
    ]));
    for (const table of data.tables) {
      const count = await database.query<{ n: string }>(
        `select count(*)::text as n from public."${table.name}"`,
      );
      expect(count.rows[0]?.n).toBe('0');
    }
    expect(
      (await database.query('select * from drizzle.__drizzle_migrations order by id')).rows,
    ).toEqual(journal.rows);
    await post('preview', { password }).expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/me')
      .set('Authorization', `Bearer ${ordinary}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
