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
  record_key: key,
  name_en: 'Synthetic doctor',
  name_hi: '??????? ????????',
  city: 'Delhi',
  state: 'Delhi',
  address_line1: 'Synthetic address',
  phone_1: '+919000000000',

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
  confirmedDetails: true,
  reviewerName: 'Test reviewer',
  reviewerQualification: 'Test listing reviewer',
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
        .send({ record_key: 'image:dept', name_en: 'Test department', is_active: true })
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
              record_key: 'image:hospital',
              name_en: 'Test hospital',
              city: 'Delhi',
              state: 'Delhi',
              address_line1: 'Test address',
              phone_1: '+919000000000',

            },
      )
      .expect(201);
    return { id: response.body.id as string, version: response.body.version as number };
  };
  const photo = () =>
    sharp({ create: { width: 64, height: 48, channels: 3, background: '#007f70' } })
      .png()
      .toBuffer();

  it('serves uploaded thumbnails and the article image without substituting its category cover', async () => {
    const server = request(app.getHttpServer());
    const article = {
      title_en: 'Article thumbnail example',
      content_en: 'Example article body.',
      category: 'Daily Wellness',
      image_url: 'https://example.test/fallback.jpg',
    };
    const created = await server.post('/api/v1/admin/content/articles').set(auth()).send(article).expect(201);
    const id = created.body.id as string;
    const admin = `/api/v1/admin/content/articles/${id}`;
    const publicArticle = `/api/v1/public/articles/${id}`;
    const upload = await server.put(`${admin}/thumbnail`).set(auth())
      .attach('file', await photo(), 'cover.png').expect(200);
    await server.get(`${admin}/thumbnail`).set(auth()).expect(200).expect('Content-Type', /image\/jpeg/);
    await server.get(`${publicArticle}/thumbnail`).expect(404);

    await server.patch(admin).set(auth()).send({ ...article, is_published: true }).expect(200);
    const thumbnail = `${publicArticle}/thumbnail?v=${upload.body.revision}`;
    const detail = await server.get(publicArticle).expect(200);
    expect(detail.body.thumbnail_url).toBe(thumbnail);
    const list = await server.get('/api/v1/public/articles').query({ search: article.title_en }).expect(200);
    expect(list.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ id, thumbnail_url: thumbnail })]));
    await server.get(thumbnail).expect(200).expect('Content-Type', /image\/jpeg/);

    await server.delete(`${admin}/thumbnail`).set(auth()).expect(200);
    await server.get(thumbnail).expect(404);
    const restored = await server.get(publicArticle).expect(200);
    expect(restored.body.thumbnail_url).toBe(article.image_url);

    await server.post('/api/v1/admin/content/article-categories').set(auth()).send({
      name: article.category,
      image_url: 'https://example.test/category-cover.jpg',
    }).expect(201);
    await server.patch(admin).set(auth()).send({ ...article, image_url: '', is_published: true }).expect(200);
    await server.get(publicArticle).expect(200).expect(({ body }) => {
      expect(body).toMatchObject({ image_url: '', thumbnail_url: '' });
    });
  });
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
    it(`${kind}: persists a decoded photo, respects provider visibility and synchronizes app compatibility`, async () => {
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
      await request(app.getHttpServer()).get(`/api/v1/public/${kind}/${row.id}/image`).expect(kind === 'hospitals' ? 200 : 404);
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
        `record_key,name_en,city,state\n${still.body.record_key},Imported profile,Delhi,Delhi`,
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
