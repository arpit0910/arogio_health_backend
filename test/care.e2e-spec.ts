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

// Synthetic fixtures exist only in this isolated in-memory database, never in a seed or app fallback.
describe('Public care and audited publication', () => {
  let app: NestExpressApplication, database: PGlite, token: string, reader: string;
  let hospital: { id: string; updatedAt: string }, doctor: { id: string; updatedAt: string };
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
      .send({ email: 'care-admin@example.test', password: 'Health1!' })
      .expect(201);
    token = admin.body.accessToken as string;
    await db
      .update(schema.users)
      .set({ role: 'super_admin' })
      .where(eq(schema.users.id, admin.body.user.id as string));
    const ordinary = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'care-reader@example.test', password: 'Health1!' })
      .expect(201);
    reader = ordinary.body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await database?.close();
  });
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const draft = (kind: 'hospital' | 'doctor') => ({
    kind,
    sourceKey: `isolated-test-${kind}`,
    name: `Isolated test ${kind}`,
    city: 'Jaipur',
    address: 'Synthetic address for automated tests only',
    phone: '+910000000000',
    sourceUrl: 'https://example.test/source',
    details: {
      specialties: ['Test specialty'],
      registration: kind === 'doctor' ? 'TEST-REG' : '',
      qualifications: kind === 'doctor' ? 'Synthetic test qualification' : '',
    },
  });
  const review = (row: { updatedAt: string }) => ({
    expectedUpdatedAt: row.updatedAt,
    evidence: 'Synthetic test evidence; not a real medical listing.',
    reviewerName: 'Test reviewer',
    reviewerQualification: 'Isolated test role',
    confirmedSource: true,
    publish: true,
  });
  it('allows guest public content but keeps old private contracts and administration protected', async () => {
    const discovery = await request(app.getHttpServer())
      .get('/api/v1/home/discovery')
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(discovery.body.hospitals).toEqual({ status: 'available', items: [] });
    expect(discovery.body.doctors).toEqual({ status: 'available', items: [] });
    expect(discovery.body.availability).toBe('contact-provider');
    await request(app.getHttpServer())
      .get('/api/v1/care')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await request(app.getHttpServer()).get('/api/v1/public/articles').expect(200);
    await request(app.getHttpServer()).get('/api/v1/public/meditation/content').expect(200);
    await request(app.getHttpServer()).get('/api/v1/articles').expect(401);
    await request(app.getHttpServer()).get('/api/v1/wellness').expect(401);
    await request(app.getHttpServer()).get('/api/v1/admin/care').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/admin/care')
      .set('Authorization', `Bearer ${reader}`)
      .send(draft('hospital'))
      .expect(403);
  });
  it('keeps drafts invisible, requires explicit review and rejects stale publication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/care')
      .set(auth())
      .send({ ...draft('hospital'), phone: '------' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/admin/care')
      .set(auth())
      .send({ ...draft('hospital'), phone: '123---' })
      .expect(400);
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/care')
      .set(auth())
      .send(draft('hospital'))
      .expect(201);
    hospital = created.body;
    await request(app.getHttpServer()).get(`/api/v1/care/${hospital.id}`).expect(404);
    expect(
      (await request(app.getHttpServer()).get('/api/v1/home/discovery')).body.hospitals.items,
    ).toEqual([]);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/care/${hospital.id}/review`)
      .set(auth())
      .send({ ...review(hospital), confirmedSource: false })
      .expect(400);
    const published = await request(app.getHttpServer())
      .post(`/api/v1/admin/care/${hospital.id}/review`)
      .set(auth())
      .send(review(hospital))
      .expect(201);
    hospital = published.body;
    const discovery = await request(app.getHttpServer()).get('/api/v1/home/discovery').expect(200);
    expect((discovery.body.hospitals.items as { id: string }[]).map((item) => item.id)).toEqual([
      hospital.id,
    ]);
    expect(discovery.body.hospitals.items[0].reviewEvidence).toBeUndefined();
    expect(discovery.body.hospitals.items[0].reviewedBy).toBeUndefined();
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/care/${hospital.id}`)
      .expect(200);
    expect(detail.body.verification).toBe('source-reviewed');
    expect(detail.body.reviewEvidence).toBeUndefined();
    expect(detail.body.reviewedBy).toBeUndefined();
    await request(app.getHttpServer())
      .post(`/api/v1/admin/care/${hospital.id}/review`)
      .set(auth())
      .send({ ...review(hospital), expectedUpdatedAt: '2020-01-01T00:00:00.000Z' })
      .expect(409);
    const outside = await request(app.getHttpServer()).get('/api/v1/care?city=Delhi').expect(200);
    expect(outside.body.coverage).toBe('unsupported-city');
    expect(outside.body.items).toEqual([]);
  });
  it('preserves stable identities, validates doctor links and requires re-review after editing', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/care')
      .set(auth())
      .send(draft('doctor'))
      .expect(201);
    doctor = created.body;
    await request(app.getHttpServer())
      .put(`/api/v1/admin/care/${doctor.id}/affiliations`)
      .set(auth())
      .send({ hospitalIds: [hospital.id], expectedUpdatedAt: doctor.updatedAt })
      .expect(200);
    doctor = (
      await request(app.getHttpServer())
        .get(`/api/v1/admin/care/${doctor.id}`)
        .set(auth())
        .expect(200)
    ).body;
    doctor = (
      await request(app.getHttpServer())
        .post(`/api/v1/admin/care/${doctor.id}/review`)
        .set(auth())
        .send(review(doctor))
        .expect(201)
    ).body;
    const detail = await request(app.getHttpServer()).get(`/api/v1/care/${doctor.id}`).expect(200);
    expect(detail.body.affiliations[0].id).toBe(hospital.id);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/care/${doctor.id}`)
      .set(auth())
      .send({ ...draft('doctor'), sourceKey: 'changed-key', expectedUpdatedAt: doctor.updatedAt })
      .expect(400);
    const edit = await request(app.getHttpServer())
      .put(`/api/v1/admin/care/${doctor.id}`)
      .set(auth())
      .send({
        ...draft('doctor'),
        name: 'Changed isolated fixture',
        expectedUpdatedAt: doctor.updatedAt,
      })
      .expect(200);
    expect(edit.body.id).toBe(doctor.id);
    expect(edit.body.published).toBe(false);
    await request(app.getHttpServer()).get(`/api/v1/care/${doctor.id}`).expect(404);
  });
  it('accepts guest corrections without disclosing them publicly, and audits resolution', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/care/${hospital.id}/corrections`)
      .send({ message: 'Synthetic correction: please review this source.' })
      .expect(201);
    const queue = await request(app.getHttpServer())
      .get('/api/v1/admin/care/corrections')
      .set(auth())
      .expect(200);
    expect(queue.body).toHaveLength(1);
    await request(app.getHttpServer())
      .get('/api/v1/admin/care/corrections')
      .set('Authorization', `Bearer ${reader}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/care/corrections/${queue.body[0].id}`)
      .set(auth())
      .send({ resolution: 'Synthetic test review completed.' })
      .expect(200);
    const events = await database.query<{ action: string }>(
      "select action from admin_audit where action like 'care.%'",
    );
    expect(events.rows.some((row) => row.action === 'care.correction.resolve')).toBe(true);
  });
  it('does not expose legacy bank verification without fresh provenance and supports grouped search', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/blood-banks')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    const search = await request(app.getHttpServer())
      .get('/api/v1/care-search?search=Isolated')
      .expect(200);
    expect(search.body.providers.items).toHaveLength(1);
    expect(search.body.articles.items).toEqual([]);
  });
  it('handles sourced blood-bank corrections and account-scoped private exports', async () => {
    const [bank] = await drizzle(database, { schema })
      .insert(schema.bloodBanks)
      .values({
        source_id: 'isolated-test-bank',
        name_en: 'Isolated bank fixture',
        city: 'Jaipur',
        state: 'Rajasthan',
        address_en: 'Synthetic address only',
        is_verified: true,
        source_url: 'https://example.test/bank',
        verified_at: new Date(),
      })
      .returning();
    const list = await request(app.getHttpServer()).get('/api/v1/public/blood-banks').expect(200);
    expect(list.body.items[0].id).toBe(bank!.id);
    await request(app.getHttpServer())
      .post(`/api/v1/care/blood-banks/${bank!.id}/corrections`)
      .send({ message: 'Synthetic correction for test review.' })
      .expect(201);
    const queue = await request(app.getHttpServer())
      .get('/api/v1/admin/care/corrections')
      .set(auth())
      .expect(200);
    expect(queue.body[0].entryId).toBe(bank!.id);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/care/corrections/${queue.body[0].id}`)
      .set(auth())
      .send({ resolution: 'Synthetic bank correction checked.' })
      .expect(200);
    await request(app.getHttpServer()).get('/api/v1/profile/export').expect(401);
    const exported = await request(app.getHttpServer())
      .get('/api/v1/profile/export?userId=not-your-account')
      .set('Authorization', `Bearer ${reader}`)
      .expect(200);
    expect(exported.headers['cache-control']).toBe('private, no-store');
    expect(exported.body.profile.email).toBe('care-reader@example.test');
    expect(JSON.stringify(exported.body)).not.toContain(token);
    const edited = await request(app.getHttpServer())
      .patch(`/api/v1/admin/content/blood-banks/${bank!.id}`)
      .set(auth())
      .send({
        name_en: 'Changed isolated bank',
        city: 'Jaipur',
        state: 'Rajasthan',
        address_en: 'Changed synthetic address',
        phone: '0000000000',
        is_verified: true,
        source_url: 'https://example.test/old-source',
        verified_at: new Date().toISOString(),
      })
      .expect(200);
    expect(edited.body.is_verified).toBe(false);
    expect(edited.body.source_url).toBeNull();
    expect(edited.body.verified_at).toBeNull();
    await request(app.getHttpServer())
      .get('/api/v1/public/blood-banks')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await request(app.getHttpServer())
      .post(`/api/v1/admin/care/blood-banks/${bank!.id}/review`)
      .set(auth())
      .send({
        ...review({ updatedAt: edited.body.updated_at }),
        sourceUrl: 'https://example.test/reviewed-source',
      })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/v1/public/blood-banks')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
  });
});
