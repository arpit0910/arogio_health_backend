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
import { articleHeaders, bankHeaders } from '../src/modules/directory/import';
import { Workbook } from 'exceljs';
const csv = (headers: string[], rows: Record<string, string | number>[]) =>
  Buffer.from(
    [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\r\n'),
  );
describe('Articles and nearby blood-bank directory', () => {
  let app: NestExpressApplication, database: PGlite, token: string, ordinary: string;
  beforeAll(async () => {
    database = new PGlite();
    for (const name of (await readdir(join(process.cwd(), 'drizzle')))
      .filter((name) => name.endsWith('.sql'))
      .sort())
      for (const statement of (await readFile(join(process.cwd(), 'drizzle', name), 'utf8')).split(
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
      .send({ email: 'directory-admin@example.com', password: 'Health1!' })
      .expect(201);
    token = admin.body.accessToken as string;
    await db
      .update(schema.users)
      .set({ role: 'super_admin' })
      .where(eq(schema.users.id, admin.body.user.id as string));
    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'directory-reader@example.com', password: 'Health1!' })
      .expect(201);
    ordinary = user.body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await database?.close();
  });
  const auth = () => ({ Authorization: `Bearer ${token}` });
  it('downloads a protected Excel template and imports an Excel article through HTTP', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/content/articles/template')
      .set('Authorization', `Bearer ${ordinary}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/content/articles/template')
      .set(auth())
      .expect(200)
      .expect('Content-Type', /spreadsheetml/)
      .expect('Content-Disposition', /articles-template.xlsx/);
    const workbook = new Workbook(),
      sheet = workbook.addWorksheet('Articles');
    sheet.addRow(articleHeaders);
    const row: Record<string, string | number | boolean> = {
      id: 99,
      title_en: 'Excel article',
      title_hi: 'एक्सेल लेख',
      content_en: 'Imported from Excel',
      content_hi: 'एक्सेल से आयातित',
      category: 'Care',
      is_published: false,
      created_at: '2026-10-01 10:00:00',
      updated_at: '2026-10-01 10:00:00',
    };
    sheet.addRow(articleHeaders.map((key) => row[key] ?? ''));
    const file = Buffer.from(await workbook.xlsx.writeBuffer());
    const preview = await request(app.getHttpServer())
      .post('/api/v1/admin/content/articles/import/preview')
      .set(auth())
      .attach('file', file, 'articles.xlsx')
      .expect(201);
    expect(preview.body).toMatchObject({ errorCount: 0, creates: 1 });
    await request(app.getHttpServer())
      .post('/api/v1/admin/content/articles/import/apply')
      .set(auth())
      .attach('file', file, 'articles.xlsx')
      .expect(201);
    const repeat = await request(app.getHttpServer())
      .post('/api/v1/admin/content/articles/import/preview')
      .set(auth())
      .attach('file', file, 'articles.xlsx')
      .expect(201);
    expect(repeat.body.updates).toBe(1);
    await request(app.getHttpServer())
      .post('/api/v1/admin/content/articles/import/preview')
      .set(auth())
      .attach('file', file, 'articles.xls')
      .expect(400);
    // Remove this fixture so subsequent tests retain their independent CSV counts.
    const listing = await request(app.getHttpServer())
      .get('/api/v1/admin/content/articles?search=Excel')
      .set(auth());
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/content/articles/${listing.body.items[0].id}`)
      .set(auth())
      .expect(200);
  });
  it('protects management and public reads with the appropriate roles', async () => {
    await request(app.getHttpServer()).get('/api/v1/articles').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/content/articles')
      .set('Authorization', `Bearer ${ordinary}`)
      .expect(403);
  });
  it('previews without writing, upserts exports, preserves Hindi and excludes drafts', async () => {
    const file = csv(articleHeaders, [
      {
        id: 1,
        title_en: 'A title, with commas',
        title_hi: 'स्वास्थ्य',
        excerpt_en: 'Excerpt',
        content_en: 'First\\nSecond',
        content_hi: 'लेख',
        category: 'Care',
        author_name: 'Author',
        is_published: 1,
        created_at: '2026-10-01 10:00:00',
        updated_at: '2026-10-01 10:00:00',
      },
    ]);
    const preview = await request(app.getHttpServer())
      .post('/api/v1/admin/content/articles/import/preview')
      .set(auth())
      .attach('file', file, 'articles.csv')
      .expect(201);
    expect(preview.body).toMatchObject({ creates: 1, errorCount: 0 });
    expect(
      (await request(app.getHttpServer()).get('/api/v1/articles').set(auth())).body.items,
    ).toHaveLength(0);
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .post('/api/v1/admin/content/articles/import/apply')
        .set(auth())
        .attach('file', file, 'articles.csv')
        .expect(201);
    const listing = await request(app.getHttpServer())
      .get('/api/v1/articles')
      .set(auth())
      .expect(200);
    expect(listing.body.items).toHaveLength(1);
    const id = listing.body.items[0].id as string;
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/articles/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.content_en).toBe('First\nSecond');
    expect(detail.body.title_hi).toBe('स्वास्थ्य');
    await request(app.getHttpServer())
      .post('/api/v1/admin/content/articles')
      .set(auth())
      .send({ title_en: 'Draft', content_en: 'Draft body', category: 'Care', is_published: false })
      .expect(201);
    expect(
      (await request(app.getHttpServer()).get('/api/v1/articles').set(auth())).body.items,
    ).toHaveLength(1);
  });
  it('ranks real coordinates, keeps unlocated banks searchable, and rejects invalid imports atomically', async () => {
    const base = {
      name_en: 'Bank',
      name_hi: 'रक्त बैंक',
      city: 'Jaipur',
      state: 'Rajasthan',
      address_en: 'Test address',
      country_code: '+91',
      emergency_country_code: '+91',
      is_verified: 1,
      is_24_7: 1,
      is_government: 0,
      component_facility: 1,
      apheresis_facility: 0,
      available_blood_groups: 'A+;O-',
      website: 'example.com',
    };
    const file = csv(bankHeaders, [
      { ...base, id: 1, latitude: 26.9, longitude: 75.8 },
      { ...base, id: 2, name_en: 'Further bank', latitude: 27, longitude: 75.8 },
      { ...base, id: 3, name_en: 'Unlocated bank' },
    ]);
    await request(app.getHttpServer())
      .post('/api/v1/admin/content/blood-banks/import/apply')
      .set(auth())
      .attach('file', file, 'banks.csv')
      .expect(201);
    const nearby = await request(app.getHttpServer())
      .post('/api/v1/blood-banks/nearby')
      .set(auth())
      .send({ latitude: 26.9, longitude: 75.8, radiusKm: 50, bloodGroup: 'O-' })
      .expect(200);
    expect(nearby.body.items).toHaveLength(2);
    expect(nearby.body.items[0].distanceKm).toBeCloseTo(0);
    expect(nearby.body.items[1].distanceKm).toBeGreaterThan(10);
    expect(nearby.body.missingCoordinates).toBe(1);
    expect(nearby.headers['cache-control']).toContain('no-store');
    expect(
      (await request(app.getHttpServer()).get('/api/v1/blood-banks?search=Jaipur').set(auth())).body
        .items,
    ).toHaveLength(3);
    await request(app.getHttpServer())
      .post('/api/v1/admin/content/blood-banks/import/apply')
      .set(auth())
      .attach(
        'file',
        csv(bankHeaders, [
          { ...base, id: 4 },
          { ...base, id: 5, latitude: 26 },
        ]),
        'invalid.csv',
      )
      .expect(400);
    expect(
      (await request(app.getHttpServer()).get('/api/v1/blood-banks').set(auth())).body.items,
    ).toHaveLength(3);
    await request(app.getHttpServer())
      .post('/api/v1/blood-banks/nearby')
      .set(auth())
      .send({ latitude: 91, longitude: 0 })
      .expect(400);
    const absent = await request(app.getHttpServer())
      .post('/api/v1/blood-banks/nearby')
      .set(auth())
      .send({ latitude: 26.9, longitude: 75.8, bloodGroup: 'AB-' })
      .expect(200);
    expect(absent.body.items).toHaveLength(0);
  });
});
