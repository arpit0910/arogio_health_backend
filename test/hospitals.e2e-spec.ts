import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import request from 'supertest';
import { Workbook } from 'exceljs';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { configureApplication } from '../src/bootstrap/configure-application';
import * as schema from '../src/database/schema';
import { hospitalHeaders } from '../src/modules/hospitals/imports/hospitals.import';

const { migrateLocal } = createRequire(__filename)('../scripts/database/migrate-local.cjs') as {
  migrateLocal: (db: PGlite, directory: string) => Promise<void>;
};
const csv = (rows: Record<string, string | number>[]) =>
  Buffer.from(
    [
      hospitalHeaders.join(','),
      ...rows.map((row) =>
        hospitalHeaders.map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\r\n'),
  );
const draft = (key = 'test:hospital') => ({
  record_key: key,
  name_en: 'Synthetic test hospital',
  name_hi: 'परीक्षण अस्पताल',
  hospital_type: 'Government',
  city: 'Delhi',
  state: 'Delhi',
  address_line1: 'Synthetic address for isolated tests',
  country_code_1: '+91',
  phone_1: '9000000000',

  accepts_ayushman: true,
});
const review = (version: number) => ({
  expectedVersion: version,
  publish: true,
  confirmedDetails: true,
  reviewerName: 'Test reviewer',
  reviewerQualification: 'Test listing reviewer',
  evidence: 'Synthetic verification evidence for automated tests only.',
});
describe('Structured hospital directory', () => {
  let app: NestExpressApplication, database: PGlite, token: string, ordinary: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const upload = (
    action: string,
    buffer: Buffer,
    previewToken?: string,
    filename = 'hospitals.csv',
  ) => {
    const call = request(app.getHttpServer())
      .post(`/api/v1/admin/hospitals/import/${action}`)
      .set(auth());
    if (previewToken) call.field('previewToken', previewToken);
    return call.attach('file', buffer, filename);
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
      .send({ email: 'hospital-admin@example.test', password: 'Health1!' })
      .expect(201);
    token = admin.body.accessToken as string;
    await db
      .update(schema.userAccounts)
      .set({ role: 'super_admin' })
      .where(eq(schema.userAccounts.id, admin.body.user.id as string));
    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'hospital-reader@example.test', password: 'Health1!' })
      .expect(201);
    ordinary = user.body.accessToken as string;
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await database?.close();
  });
  beforeEach(async () => {
    await database.exec(
      'delete from care_provider_affiliations; delete from care_directory_corrections; delete from care_directory_entries;',
    );
  });
  it('starts empty, protects administration and downloads both templates', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/hospitals')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await request(app.getHttpServer()).get('/api/v1/admin/hospitals').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/hospitals/template')
      .set('Authorization', `Bearer ${ordinary}`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/admin/hospitals')
      .set('Authorization', `Bearer ${ordinary}`)
      .send(draft())
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/hospitals/template?format=csv')
      .set(auth())
      .expect(200)
      .expect('Content-Disposition', /hospitals-template.csv/);
    await request(app.getHttpServer())
      .get('/api/v1/admin/hospitals/template')
      .set(auth())
      .expect(200)
      .expect('Content-Type', /spreadsheetml/);
  });
  it('pages by distance and lists hospitals without coordinates in city mode', async () => {
    for (const [name, city, latitude] of [
      ['A farther hospital', 'Delhi', 28.7],
      ['Z nearer hospital', 'Delhi', 28.6],
      ['Unmapped hospital', 'Delhi', null],
      ['Out of range hospital', 'Jaipur', 26.9],
    ] as const) {
      await request(app.getHttpServer()).post('/api/v1/admin/hospitals').set(auth())
        .send({ ...draft(`test:${name.toLowerCase().replaceAll(' ', '-')}`), name_en: name, city, latitude, longitude: latitude == null ? null : 77.2 })
        .expect(201);
    }
    const location = { latitude: 28.6, longitude: 77.2, radiusKm: 50 };
    const nearby = () => request(app.getHttpServer()).post('/api/v1/public/hospitals/nearby');
    const first = await nearby().send({ location, limit: 1 }).expect(200).expect('Cache-Control', /no-store/);
    expect(first.body).toMatchObject({ total: 2, hasNext: true, items: [{ name_en: 'Z nearer hospital', distanceKm: 0 }] });
    const second = await nearby().send({ location, limit: 1, page: 2 }).expect(200);
    expect(second.body).toMatchObject({ hasNext: false, items: [{ name_en: 'A farther hospital', distanceKm: expect.any(Number) }] });
    await nearby().send({ location: { latitude: 28.6 } }).expect(400);
    const byCity = await request(app.getHttpServer()).get('/api/v1/public/hospitals').query({ city: 'delhi' }).expect(200);
    expect(byCity.body.total).toBe(3);
  });
  it('publishes through review and preserves shared care IDs, contacts, multi-city discovery and corrections', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/hospitals')
      .set(auth())
      .send(draft())
      .expect(201);
    const id = created.body.id as string;
    expect(created.body).toMatchObject({ version: 1, published: false, accepts_esic: null });
    await request(app.getHttpServer()).get(`/api/v1/public/hospitals/${id}`).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/care/${id}`).expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/hospitals/${id}/review`)
      .set(auth())
      .send(review(1))
      .expect(201);
    const listed = await request(app.getHttpServer())
      .get('/api/v1/public/hospitals')
      .query({ city: 'delhi', benefit: 'ayushman', search: 'परीक्षण' })
      .expect(200);
    expect(listed.body.total).toBe(1);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/public/hospitals/${id}`)
      .expect(200);
    expect(detail.body.reviewEvidence).toBeUndefined();
    expect(detail.body.reviewedBy).toBeUndefined();
    const care = await request(app.getHttpServer()).get('/api/v1/care?kind=hospital').expect(200);
    expect(care.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id,
          city: 'Delhi',
          phone: '+919000000000',
          verification: 'source-reviewed',
        }),
      ]),
    );
    await request(app.getHttpServer())
      .get('/api/v1/care?kind=hospital&city=DELHI')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
    await request(app.getHttpServer())
      .get('/api/v1/care?kind=hospital&city=Mumbai')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(0));
    const legacy = await request(app.getHttpServer()).get(`/api/v1/care/${id}`).expect(200);
    expect(legacy.body).toMatchObject({
      id,
      kind: 'hospital',

      affiliations: [],
    });
    await request(app.getHttpServer())
      .post(`/api/v1/care/${id}/corrections`)
      .send({ message: 'Synthetic correction report about the contact.' })
      .expect(201);
    const home = await request(app.getHttpServer()).get('/api/v1/home/discovery').expect(200);
    expect(home.body.hospitals.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id })]),
    );
    expect((await database.query('select count(*)::int as count from hospitals')).rows).toEqual([
      { count: 1 },
    ]);
    expect(
      (await database.query('select count(*)::int as count from care_directory_entries')).rows,
    ).toEqual([{ count: 1 }]);
  });
  it('keeps partial fields, makes edits drafts, rejects stale changes, and protects the structured projection from legacy editing', async () => {
    const made = await request(app.getHttpServer())
        .post('/api/v1/admin/hospitals')
        .set(auth())
        .send(draft())
        .expect(201),
      id = made.body.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/admin/hospitals/${id}/review`)
      .set(auth())
      .send(review(1))
      .expect(201);
    const changed = await request(app.getHttpServer())
      .patch(`/api/v1/admin/hospitals/${id}`)
      .set(auth())
      .send({ hospital_type: 'Private', expectedVersion: 2 })
      .expect(200);
    expect(changed.body).toMatchObject({
      version: 3,
      published: false,
      name_hi: 'परीक्षण अस्पताल',
      phone_1: '9000000000',
      accepts_ayushman: true,
    });
    await request(app.getHttpServer()).get(`/api/v1/care/${id}`).expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/hospitals/${id}`)
      .set(auth())
      .send({ city: 'Mumbai', expectedVersion: 2 })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/hospitals/${id}?expected_version=2`)
      .set(auth())
      .expect(409);
    const generic = await request(app.getHttpServer())
      .get(`/api/v1/admin/care/${id}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/care/${id}`)
      .set(auth())
      .send({
        recordKey: 'test:hospital',
        kind: 'hospital',
        name: 'Wrong edit path',
        city: 'Jaipur',

        details: {},
        expectedUpdatedAt: generic.body.updatedAt as string,
      })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/hospitals/${id}?expected_version=3`)
      .set(auth())
      .expect(200);
    expect(
      (await database.query('select count(*)::int as count from care_directory_entries')).rows,
    ).toEqual([{ count: 0 }]);
  });
  it('approves complete listings without a source URL and keeps expired review separate from visibility', async () => {
    const created = await request(app.getHttpServer())
        .post('/api/v1/admin/hospitals')
        .set(auth())
        .send({ ...draft() })
        .expect(201),
      id = created.body.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/admin/hospitals/${id}/review`)
      .set(auth())
      .send({ expectedVersion: 1, publish: true })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/hospitals/${id}/review`)
      .set(auth())
      .send({ expectedVersion: 1, publish: true, confirmedDetails: true })
      .expect(201)
      .expect(({ body }) => expect(body).not.toHaveProperty('source_url'));
    await database.query('update care_directory_entries set reviewed_at=$1 where id=$2', [
      new Date('2000-01-01'),
      id,
    ]);
    await request(app.getHttpServer()).get(`/api/v1/care/${id}`).expect(404);
    await request(app.getHttpServer()).get(`/api/v1/public/hospitals/${id}`).expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/public/hospitals?benefit=esic')
      .expect(200)
      .expect(({ body }) => expect(body.total).toBe(0));
    await request(app.getHttpServer())
      .post('/api/v1/admin/hospitals')
      .set(auth())
      .send({ ...draft('bad'), city: '' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/admin/hospitals')
      .set(auth())
      .send({ ...draft('bad'), latitude: 12, longitude: null })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/admin/hospitals')
      .set(auth())
      .send({ ...draft('bad'), country_code_1: '', phone_1: '9000000000' })
      .expect(400);
  });
  it('imports legacy columns as drafts without inferring verification or creating doctors', async () => {
    const file = Buffer.from(
      'id,name_en,name_hi,type,city,state,address_line1,country_code_1,phone_1,is_verified,accepts_ayushman,cashless_schemes_list\n5,Example Hospital,परीक्षण,Government,Lucknow,Uttar Pradesh,Sample address,+91,9000000000,1,1,Example scheme',
    );
    const preview = await upload('preview', file).expect(201);
    expect(preview.body).toMatchObject({
      creates: 1,
      updates: 0,
      ignoredVerificationFlags: 1,
      errorCount: 0,
    });
    expect((await database.query('select count(*)::int as count from hospitals')).rows).toEqual([
      { count: 0 },
    ]);
    await upload('apply', file, preview.body.previewToken as string).expect(201);
    const list = await request(app.getHttpServer()).get('/api/v1/admin/hospitals').set(auth());
    expect(list.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          record_key: 'swasthya:hospital:5',
          city: 'Lucknow',
          published: false,
          accepts_ayushman: true,
          accepts_esic: null,
          cashless_schemes: ['Example scheme'],
        }),
      ]),
    );
    await request(app.getHttpServer())
      .get('/api/v1/care?kind=hospital')
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(0));
    expect(
      (
        await database.query(
          "select count(*)::int as count from care_directory_entries where kind='doctor'",
        )
      ).rows,
    ).toEqual([{ count: 0 }]);
    expect(
      (await database.query('select count(*)::int as count from care_provider_affiliations')).rows,
    ).toEqual([{ count: 0 }]);
    await upload('apply', file, preview.body.previewToken as string).expect(409);
  });
  it('reuses identities on update and requires a fresh preview after file or record changes', async () => {
    const file = csv([
      { record_key: 'csv:1', name_en: 'Import hospital', city: 'Pune', state: 'Maharashtra' },
    ]);
    const initial = await upload('preview', file).expect(201);
    await upload('apply', file, initial.body.previewToken as string).expect(201);
    const rows = await request(app.getHttpServer()).get('/api/v1/admin/hospitals').set(auth()),
      id = (rows.body.items as { id: string }[])[0]!.id;
    const preview = await upload('preview', file).expect(201);
    expect(preview.body.updates).toBe(1);
    await upload('apply', file, (preview.body.previewToken as string) + 'x').expect(400);
    await upload(
      'apply',
      csv([{ record_key: 'csv:2', name_en: 'Changed file', city: 'Pune', state: 'Maharashtra' }]),
      preview.body.previewToken as string,
    ).expect(409);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/hospitals/${id}`)
      .set(auth())
      .send({ name_hi: 'अस्पताल', expectedVersion: 1 })
      .expect(200);
    await upload('apply', file, preview.body.previewToken as string).expect(409);
    const refreshed = await upload('preview', file).expect(201);
    await upload('apply', file, refreshed.body.previewToken as string).expect(201);
    expect(
      (await request(app.getHttpServer()).get('/api/v1/admin/hospitals').set(auth())).body.items,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ id, record_key: 'csv:1', version: 3 })]),
    );
  });
  it('validates the whole CSV/XLSX import and rejects conflicting legacy identities and formulas', async () => {
    const bad = await upload(
      'preview',
      csv([
        { record_key: 'a', name_en: 'A', city: 'B', state: 'C' },
        { record_key: 'a', name_en: 'Duplicate', city: 'B', state: 'C' },
      ]),
    ).expect(201);
    expect(bad.body.previewToken).toBeNull();
    expect(bad.body.errorCount).toBe(1);
    await upload('apply', csv([{ record_key: 'a', name_en: 'A', city: 'B', state: 'C' }])).expect(
      400,
    );
    await upload('preview', Buffer.from('junk'), undefined, 'hospitals.xls').expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/admin/care')
      .set(auth())
      .send({
        recordKey: 'collision',
        kind: 'hospital',
        name: 'Existing legacy',
        city: 'Jaipur',

        details: {},
      })
      .expect(201);
    const collision = await upload(
      'preview',
      csv([{ record_key: 'collision', name_en: 'Would duplicate', city: 'Delhi', state: 'Delhi' }]),
    ).expect(201);
    expect(collision.body.errorCount).toBe(1);
    const workbook = new Workbook(),
      sheet = workbook.addWorksheet('Hospitals');
    sheet.addRow(hospitalHeaders);
    sheet.addRow(
      hospitalHeaders.map(
        (key) =>
          (
            ({
              record_key: 'xlsx:1',
              name_en: 'Workbook hospital',
              city: 'Bhopal',
              state: 'Madhya Pradesh',
            }) as Record<string, string>
          )[key] ?? '',
      ),
    );
    const file = Buffer.from(await workbook.xlsx.writeBuffer()),
      preview = await upload('preview', file, undefined, 'hospitals.xlsx').expect(201);
    await upload('apply', file, preview.body.previewToken as string, 'hospitals.xlsx').expect(201);
    sheet.getCell('B2').value = { formula: '1+1', result: 2 };
    await upload(
      'preview',
      Buffer.from(await workbook.xlsx.writeBuffer()),
      undefined,
      'hospitals.xlsx',
    ).expect(400);
    expect((await database.query('select count(*)::int as count from hospitals')).rows).toEqual([
      { count: 1 },
    ]);
  });
  it('serves hospital portal controls and its CSP-compatible script', async () => {
    const page = await request(app.getHttpServer()).get('/admin').expect(200);
    expect(page.text).toContain('data-page="hospitals"');
    const script = await request(app.getHttpServer()).get('/admin-assets/hospitals.js').expect(200);
    expect(script.text).toContain('hospitalReviewEditor');
    expect(script.text).toContain('/admin/hospitals/import/preview');
  });
  it('lists imports without a verification claim and gives admins an explicit audited hide/show control', async () => {
    const created = await request(app.getHttpServer()).post('/api/v1/admin/hospitals').set(auth()).send(draft('visibility-fixture')).expect(201);
    const id = created.body.id as string;
    const visible = await request(app.getHttpServer()).get(`/api/v1/public/hospitals/${id}`).expect(200);
    expect(visible.body.published).toBe(false);
    expect(visible.body.reviewedAt).toBeNull();
    expect(visible.body.reviewedBy).toBeUndefined();
    await request(app.getHttpServer()).post(`/api/v1/admin/hospitals/${id}/visibility`).set({ Authorization: `Bearer ${ordinary}` }).send({ listed: false, expectedVersion: 1 }).expect(403);
    await request(app.getHttpServer()).post(`/api/v1/admin/hospitals/${id}/visibility`).set(auth()).send({ listed: false, expectedVersion: 1 }).expect(201);
    await request(app.getHttpServer()).get(`/api/v1/public/hospitals/${id}`).expect(404);
    await request(app.getHttpServer()).post(`/api/v1/admin/hospitals/${id}/visibility`).set(auth()).send({ listed: true, expectedVersion: 1 }).expect(409);
    await request(app.getHttpServer()).post(`/api/v1/admin/hospitals/${id}/visibility`).set(auth()).send({ listed: true, expectedVersion: 2 }).expect(201);
    await request(app.getHttpServer()).get(`/api/v1/public/hospitals/${id}`).expect(200);
  });

});
