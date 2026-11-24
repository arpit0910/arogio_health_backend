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
import { diseaseHeaders } from '../src/modules/diseases/imports/diseases.import';

const { migrateLocal } = createRequire(__filename)('../scripts/database/migrate-local.cjs') as {
  migrateLocal: (db: PGlite, directory: string) => Promise<void>;
};
const csv = (rows: string[][]) =>
  Buffer.from(
    [diseaseHeaders, ...rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
      .join('\r\n'),
  );
describe('Diseases', () => {
  let app: NestExpressApplication, database: PGlite, token: string, ordinary: string;
  const admin = () => ({ Authorization: `Bearer ${token}` });
  const upload = (
    action: string,
    buffer: Buffer,
    previewToken?: string,
    filename = 'departments.csv',
  ) => {
    const call = request(app.getHttpServer())
      .post(`/api/v1/admin/diseases/import/${action}`)
      .set(admin());
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
    const account = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'department-admin@example.test', password: 'Health1!' })
      .expect(201);
    token = account.body.accessToken;
    await db
      .update(schema.userAccounts)
      .set({ role: 'super_admin' })
      .where(eq(schema.userAccounts.id, account.body.user.id as string));
    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'department-user@example.test', password: 'Health1!' })
      .expect(201);
    ordinary = user.body.accessToken;
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await database?.close();
  });
  beforeEach(async () => {
    await database.exec('delete from medical_diseases; delete from medical_departments');
  });

  const department = async () =>
    (
      await request(app.getHttpServer())
        .post('/api/v1/admin/departments')
        .set(admin())
        .send({ record_key: 'swasthya:1', name_en: 'Test department', is_active: true })
        .expect(201)
    ).body as { id: string };
  it('protects administration and returns empty public records and templates', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/diseases')
      .expect(200)
      .expect(({ body }) => expect(body.total).toBe(0));
    await request(app.getHttpServer()).get('/api/v1/admin/diseases').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/admin/diseases')
      .set('Authorization', `Bearer ${ordinary}`)
      .send({})
      .expect(403);
    for (const format of ['csv', 'xlsx'])
      await request(app.getHttpServer())
        .get('/api/v1/admin/diseases/template?format=' + format)
        .set(admin())
        .expect(200);
  });
  it('requires an existing department and gates public list/detail by both active flags', async () => {
    const d = await department();
    await request(app.getHttpServer())
      .post('/api/v1/admin/diseases')
      .set(admin())
      .send({
        record_key: 'bad',
        name_en: 'Bad',
        department_id: '00000000-0000-4000-8000-000000000000',
      })
      .expect(400);
    const row = await request(app.getHttpServer())
      .post('/api/v1/admin/diseases')
      .set(admin())
      .send({
        record_key: 'test:disease',
        name_en: 'Test disease',
        name_hi: 'Hindi disease',
        description_en: 'Test description',
        department_id: d.id,
        is_active: true,
      })
      .expect(201);
    const id = row.body.id as string;
    await request(app.getHttpServer())
      .get('/api/v1/public/diseases?search=Hindi&department_id=' + d.id)
      .expect(200)
      .expect(({ body }) => expect(body.total).toBe(1));
    await request(app.getHttpServer())
      .patch('/api/v1/admin/diseases/' + id)
      .set(admin())
      .send({ expectedVersion: 1, description_hi: 'Updated' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          name_en: 'Test disease',
          is_active: true,
          department_id: d.id,
          version: 2,
        }),
      );
    await request(app.getHttpServer())
      .patch('/api/v1/admin/diseases/' + id)
      .set(admin())
      .send({ expectedVersion: 1, name_en: 'Stale' })
      .expect(409);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/departments/' + d.id)
      .set(admin())
      .send({ expectedVersion: 1, is_active: false })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/public/diseases/' + id)
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/public/diseases')
      .expect(200)
      .expect(({ body }) => expect(body.total).toBe(0));
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/departments/${d.id}?expected_version=2`)
      .set(admin())
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/diseases/${id}?expected_version=2`)
      .set(admin())
      .expect(200);
  });
  it('imports bilingual records atomically with exact department references and stable identities', async () => {
    await department();
    const bytes = csv([
      ['test:disease', 'Imported disease', 'Hindi', 'Description', '', 'swasthya:1', 'true'],
    ]);
    const p = await upload('preview', bytes).expect(201);
    expect(p.body).toMatchObject({ creates: 1, errorCount: 0 });
    await upload('apply', bytes, p.body.previewToken as string).expect(201);
    const listed = await request(app.getHttpServer())
      .get('/api/v1/admin/diseases')
      .set(admin())
      .expect(200);
    const id = listed.body.items[0].id as string;
    await upload('apply', bytes, p.body.previewToken as string).expect(409);
    const p2 = await upload('preview', bytes).expect(201);
    expect(p2.body.updates).toBe(1);
    await upload('apply', bytes, p2.body.previewToken as string).expect(201);
    await request(app.getHttpServer())
      .get('/api/v1/public/diseases/' + id)
      .expect(200)
      .expect(({ body }) => expect(body.version).toBe(2));
    const invalid = await upload(
      'preview',
      csv([
        ['bad', 'Bad', '', '', '', 'missing', 'true'],
        ['good', 'Good', '', '', '', 'swasthya:1', 'true'],
      ]),
    ).expect(201);
    expect(invalid.body.previewToken).toBeNull();
    expect(invalid.body.errorCount).toBe(1);
    expect((await database.query('select * from medical_diseases')).rows).toHaveLength(1);
  });
  it('invalidates preview on master changes and refuses symptoms and workbook formulas', async () => {
    const d = await department(),
      bytes = csv([['test:disease', 'Test', '', '', '', 'swasthya:1', 'false']]);
    const p = await upload('preview', bytes).expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/departments/' + d.id)
      .set(admin())
      .send({ expectedVersion: 1, name_hi: 'Updated' })
      .expect(200);
    await upload('apply', bytes, p.body.previewToken as string).expect(409);
    await upload(
      'preview',
      Buffer.from('id,name_en,department_id,symptoms_embedding\n1,Test,1,[]'),
    ).expect(400);
    const wb = new Workbook(),
      sheet = wb.addWorksheet('Diseases');
    sheet.addRow(diseaseHeaders);
    sheet.addRow(['xlsx', 'Xlsx', '', '', '', 'swasthya:1', 'false']);
    sheet.getCell('B2').value = { formula: '1+1', result: 2 };
    await upload(
      'preview',
      Buffer.from(await wb.xlsx.writeBuffer()),
      undefined,
      'diseases.xlsx',
    ).expect(400);
  });
});
