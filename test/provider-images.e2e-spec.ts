import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { configureApplication } from '../src/bootstrap/configure-application';
import * as schema from '../src/database/schema';

const { migrateLocal } = createRequire(__filename)('../scripts/database/migrate-local.cjs') as {
  migrateLocal: (db: PGlite, directory: string) => Promise<void>;
};
const draft = (key = 'test:doctor') => ({
  source_key: key,
  name_en: 'Synthetic doctor',
  name_hi: '??????? ????????',
  city: 'Delhi',
  state: 'Delhi',
  address_line1: 'Synthetic address',
  phone_1: '+919000000000',
  source_url: 'https://example.test/doctor',
  registration_number: 'TEST-123',
  medical_council: 'Test council',
  qualifications: ['MBBS'],
  languages: ['Hindi'],
  experience_years: 5,
  consultation_fee: 500,
});
const review = (version: number) => ({
  expectedVersion: version,
  publish: true,
  confirmedSource: true,
  reviewerName: 'Test reviewer',
  reviewerQualification: 'Test source review role',
  evidence: 'Synthetic verification evidence for automated tests only.',
});
describe('Provider image uploads', () => {
  let app: NestExpressApplication, database: PGlite, token: string, ordinary: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
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
      .send({ email: 'doctor-admin@example.test', password: 'Health1!' })
      .expect(201);
    token = admin.body.accessToken as string;
    await db
      .update(schema.userAccounts)
      .set({ role: 'super_admin' })
      .where(eq(schema.userAccounts.id, admin.body.user.id as string));
    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'doctor-reader@example.test', password: 'Health1!' })
      .expect(201);
    ordinary = user.body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await database?.close();
  });
  beforeEach(async () => {
    await database.exec(
      'delete from doctor_hospital_affiliations; delete from doctor_departments; delete from doctors; delete from care_provider_affiliations; delete from care_directory_corrections; delete from care_directory_entries; delete from medical_diseases; delete from medical_departments;',
    );
  });

  const profile = async (kind: 'doctors' | 'hospitals') => {
    let departmentId: string | undefined;
    if (kind === 'doctors') {
      const d = await request(app.getHttpServer())
        .post('/api/v1/admin/departments')
        .set(auth())
        .send({ source_key: 'image:dept', name_en: 'Test department', is_active: true })
        .expect(201);
      departmentId = d.body.id as string;
    }
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/' + kind)
      .set(auth())
      .send(
        kind === 'doctors'
          ? { ...draft(), department_ids: [departmentId] }
          : {
              source_key: 'image:hospital',
              name_en: 'Test hospital',
              city: 'Delhi',
              state: 'Delhi',
              address_line1: 'Test address',
              phone_1: '+919000000000',
              source_url: 'https://example.test/hospital',
            },
      )
      .expect(201);
    return { id: response.body.id as string, version: response.body.version as number };
  };
  const photo = () =>
    sharp({ create: { width: 64, height: 48, channels: 3, background: '#007f70' } })
      .png()
      .toBuffer();
  const uploadImage = (
    kind: string,
    id: string,
    bytes: Buffer,
    version = 1,
    tokenOverride = token,
  ) =>
    request(app.getHttpServer())
      .put(`/api/v1/admin/${kind}/${id}/image`)
      .set('Authorization', `Bearer ${tokenOverride}`)
      .field('expectedVersion', String(version))
      .field('alt', 'Synthetic provider photo')
      .attach('file', bytes, { filename: 'photo.png', contentType: 'image/png' });
  for (const kind of ['doctors', 'hospitals'] as const) {
    it(`${kind}: persists a decoded photo, keeps drafts private and synchronizes app compatibility`, async () => {
      await request(app.getHttpServer())
        .get('/admin')
        .expect(200)
        .expect('Content-Security-Policy', /img-src[^;]*blob:/);
      const row = await profile(kind),
        bytes = await photo();
      await request(app.getHttpServer())
        .post(`/api/v1/admin/${kind}/${row.id}/review`)
        .set(auth())
        .send(review(1))
        .expect(201);
      const upload = await uploadImage(kind, row.id, bytes, 2).expect(200);
      expect(upload.body).toMatchObject({
        version: 3,
        published: false,
        reviewRequired: true,
        image_alt: 'Synthetic provider photo',
      });
      expect(upload.body.image_url).toMatch(new RegExp(`/public/${kind}/${row.id}/image`));
      await request(app.getHttpServer()).get(`/api/v1/public/${kind}/${row.id}/image`).expect(404);
      const admin = await request(app.getHttpServer())
        .get(`/api/v1/admin/${kind}/${row.id}/image`)
        .set(auth())
        .expect(200)
        .expect('Content-Type', /image\/jpeg/)
        .expect('Cache-Control', 'no-store');
      expect((await sharp(admin.body as Buffer).metadata()).format).toBe('jpeg');
      await request(app.getHttpServer())
        .get(`/api/v1/admin/${kind}/${row.id}`)
        .set(auth())
        .expect(200)
        .expect(({ body }) => {
          expect(body.image_data).toBeUndefined();
          expect(body.image_alt).toBe('Synthetic provider photo');
        });
      await request(app.getHttpServer())
        .post(`/api/v1/admin/${kind}/${row.id}/review`)
        .set(auth())
        .send(review(3))
        .expect(201);
      await request(app.getHttpServer())
        .get(upload.body.image_url as string)
        .expect(200)
        .expect('Content-Type', /image\/jpeg/);
      const legacy = await request(app.getHttpServer())
        .get('/api/v1/care/' + row.id)
        .expect(200);
      expect(legacy.body.imageUrl).toBe(upload.body.image_url);
      const list = await request(app.getHttpServer())
        .get('/api/v1/public/' + kind)
        .expect(200);
      expect(list.body.items[0].image_url).toBe(upload.body.image_url);
      expect(list.body.items[0].image_data).toBeUndefined();
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/${kind}/${row.id}`)
        .set(auth())
        .send({ expectedVersion: 4, summary_en: 'Updated description' })
        .expect(200)
        .expect(({ body }) => expect(body.image_data).toBeUndefined());
      const still = await request(app.getHttpServer())
        .get(`/api/v1/admin/${kind}/${row.id}`)
        .set(auth())
        .expect(200);
      expect(still.body.image_url).toBe(upload.body.image_url);
      const csv = Buffer.from(
        `source_key,name_en,city,state\n${still.body.source_key},Imported profile,Delhi,Delhi`,
      );
      const preview = await request(app.getHttpServer())
        .post(`/api/v1/admin/${kind}/import/preview`)
        .set(auth())
        .attach('file', csv, 'providers.csv')
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/${kind}/import/apply`)
        .set(auth())
        .field('previewToken', preview.body.previewToken as string)
        .attach('file', csv, 'providers.csv')
        .expect(201);
      await request(app.getHttpServer())
        .get(`/api/v1/admin/${kind}/${row.id}/image`)
        .set(auth())
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/v1/admin/${kind}/${row.id}`)
        .set(auth())
        .expect(200)
        .expect(({ body }) => expect(body.image_url).toBe(upload.body.image_url));
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/${kind}/${row.id}/image?expected_version=4`)
        .set(auth())
        .expect(409);
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/${kind}/${row.id}/image?expected_version=6`)
        .set(auth())
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/v1/admin/${kind}/${row.id}/image`)
        .set(auth())
        .expect(404);
      const cleared = await request(app.getHttpServer())
        .get('/api/v1/admin/care/' + row.id)
        .set(auth())
        .expect(200);
      expect(cleared.body.imageUrl).toBeNull();
    });
    it(`${kind}: enforces role, size, actual image format and optimistic concurrency`, async () => {
      const row = await profile(kind),
        bytes = await photo();
      await uploadImage(kind, row.id, bytes, 1, ordinary).expect(403);
      await request(app.getHttpServer())
        .put(`/api/v1/admin/${kind}/${row.id}/image`)
        .attach('file', bytes, 'photo.png')
        .expect(401);
      await uploadImage(
        kind,
        row.id,
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
      ).expect(400);
      await uploadImage(kind, row.id, Buffer.from('invalid')).expect(400);
      await uploadImage(kind, row.id, Buffer.alloc(4 * 1024 * 1024 + 1)).expect(413);
      await uploadImage(kind, row.id, bytes, 2).expect(409);
      await uploadImage(kind, row.id, bytes).expect(200);
      await uploadImage(kind, row.id, bytes).expect(409);
      await request(app.getHttpServer())
        .get(`/api/v1/admin/${kind}/${row.id}/image`)
        .set('Authorization', `Bearer ${ordinary}`)
        .expect(403);
      const events = await database.query(
        "select action from administration_audit_logs where target_id=$1 and action like '%.image.%'",
        [row.id],
      );
      expect(events.rows).toHaveLength(1);
    });
  }
});
