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
import { departmentHeaders } from '../src/modules/medical-departments/imports/medical-departments.import';

const { migrateLocal } = createRequire(__filename)('../scripts/database/migrate-local.cjs') as {
  migrateLocal: (db: PGlite, directory: string) => Promise<void>;
};
const csv = (rows: string[][]) =>
  Buffer.from(
    [departmentHeaders, ...rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
      .join('\r\n'),
  );
describe('Medical departments', () => {
  let app: NestExpressApplication, database: PGlite, token: string, ordinary: string;
  const admin = () => ({ Authorization: `Bearer ${token}` });
  const upload = (
    action: string,
    buffer: Buffer,
    previewToken?: string,
    filename = 'departments.csv',
  ) => {
    const call = request(app.getHttpServer())
      .post(`/api/v1/admin/departments/import/${action}`)
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
    await database.exec('delete from medical_departments');
  });

  it('starts empty and protects administration and templates', async () => {
    const empty = await request(app.getHttpServer()).get('/api/v1/public/departments').expect(200);
    expect(empty.body).toMatchObject({ items: [], total: 0, hasNext: false });
    await request(app.getHttpServer()).get('/api/v1/admin/departments').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/departments/template')
      .set('Authorization', `Bearer ${ordinary}`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/admin/departments')
      .set('Authorization', `Bearer ${ordinary}`)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/departments/template?format=csv')
      .set(admin())
      .expect(200)
      .expect('Content-Disposition', /medical-departments-template.csv/);
    await request(app.getHttpServer())
      .get('/api/v1/admin/departments/template')
      .set(admin())
      .expect(200)
      .expect('Content-Type', /spreadsheetml/);
  });

  it('supports bilingual CRUD, explicit visibility, unique names and optimistic versions', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/departments')
      .set(admin())
      .send({
        source_key: 'cardiology',
        name_en: 'Cardiology',
        name_hi: 'हृदय रोग',
        description_en: 'Heart care',
      })
      .expect(201);
    const row = created.body;
    expect(row).toMatchObject({ is_active: false, version: 1 });
    await request(app.getHttpServer()).get(`/api/v1/public/departments/${row.id}`).expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/admin/departments')
      .set(admin())
      .send({ source_key: 'another', name_en: ' cardiology ' })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/departments/${row.id}`)
      .set(admin())
      .send({ is_active: true, expectedVersion: 1 })
      .expect(200);
    const search = await request(app.getHttpServer())
      .get('/api/v1/public/departments')
      .query({ search: 'हृदय', language: 'hi', limit: 1 })
      .expect(200);
    expect(search.body).toMatchObject({ total: 1, hasNext: false });
    expect(search.body.items[0].id).toBe(row.id);
    await request(app.getHttpServer())
      .get('/api/v1/public/departments?status=inactive')
      .expect(400);
    await request(app.getHttpServer()).get('/api/v1/public/departments/not-a-uuid').expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/departments/${row.id}`)
      .set(admin())
      .send({ name_en: 'Stale', expectedVersion: 1 })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/departments/${row.id}?expected_version=1`)
      .set(admin())
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/departments/${row.id}?expected_version=2`)
      .set(admin())
      .expect(200);
    await request(app.getHttpServer()).get(`/api/v1/public/departments/${row.id}`).expect(404);
    const audit = await database.query<{ count: number }>(
      "select count(*)::int as count from administration_audit_logs where action like 'medical-departments.%'",
    );
    expect(audit.rows[0]!.count).toBeGreaterThanOrEqual(3);
  });

  it('previews without writes, maps legacy IDs, applies once and updates the same source identity', async () => {
    const file = Buffer.from(
      'id,name_en,name_hi,description_en,is_active\n101,Neurology,तंत्रिका विज्ञान,Nerve care,1\n102,Dermatology,,,',
    );
    const preview = await upload('preview', file).expect(201);
    expect(preview.body).toMatchObject({
      totalRows: 2,
      creates: 2,
      updates: 0,
      activeRows: 1,
      errorCount: 0,
    });
    expect(
      (await request(app.getHttpServer()).get('/api/v1/admin/departments').set(admin())).body.total,
    ).toBe(0);
    await upload('apply', file, preview.body.previewToken as string).expect(201);
    await upload('apply', file, preview.body.previewToken as string).expect(409);
    const current = await request(app.getHttpServer())
      .get('/api/v1/admin/departments')
      .set(admin());
    expect(current.body.total).toBe(2);
    expect(
      (current.body.items as { id: string; source_key: string }[]).some(
        (row: { source_key: string }) => row.source_key === 'swasthya:101',
      ),
    ).toBe(true);
    const ids = (current.body.items as { id: string; source_key: string }[])
      .map((row: { id: string }) => row.id)
      .sort();
    const repeated = await upload('preview', file).expect(201);
    expect(repeated.body).toMatchObject({ creates: 0, updates: 2 });
    await upload('apply', file, repeated.body.previewToken as string).expect(201);
    const updated = await request(app.getHttpServer())
      .get('/api/v1/admin/departments')
      .set(admin());
    expect((updated.body.items as { id: string }[]).map((row) => row.id).sort()).toEqual(ids);
    expect((await request(app.getHttpServer()).get('/api/v1/public/departments')).body.total).toBe(
      1,
    );
    expect(
      (await database.query('select count(*)::int as count from care_directory_entries')).rows,
    ).toEqual([{ count: 0 }]);
  });

  it('rejects invalid rows, duplicate identities, name conflicts and malformed files without partial writes', async () => {
    const invalid = csv([
      ['one', 'Medicine', '', '', '', '1'],
      ['one', 'Surgery', '', '', '', '1'],
    ]);
    const preview = await upload('preview', invalid).expect(201);
    expect(preview.body.errorCount).toBe(1);
    expect(preview.body.previewToken as string).toBeNull();
    await upload('apply', invalid).expect(400);
    await upload('preview', Buffer.from('name_en,unknown\nBad,value')).expect(400);
    await upload('preview', Buffer.from('data'), undefined, 'departments.xls').expect(400);
    const wrongFlag = await upload('preview', csv([['two', 'Surgery', '', '', '', 'yes']])).expect(
      201,
    );
    expect(wrongFlag.body.errorCount).toBe(1);
    expect(
      (await request(app.getHttpServer()).get('/api/v1/admin/departments').set(admin())).body.total,
    ).toBe(0);
    await request(app.getHttpServer())
      .post('/api/v1/admin/departments')
      .set(admin())
      .send({ source_key: 'local', name_en: 'Surgery' })
      .expect(201);
    const conflict = await upload('preview', csv([['remote', 'SURGERY', '', '', '', '1']])).expect(
      201,
    );
    expect(conflict.body.errorCount).toBe(1);
    expect(conflict.body.previewToken).toBeNull();
  });

  it('binds preview to the file and database version and rejects tampered/expired previews', async () => {
    const file = csv([['first', 'General medicine', '', '', '', '1']]);
    const preview = await upload('preview', file).expect(201);
    await upload('apply', file, (preview.body.previewToken as string) + 'x').expect(400);
    await upload(
      'apply',
      csv([['different', 'Pediatrics', '', '', '', '1']]),
      preview.body.previewToken as string,
    ).expect(409);
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now + 11 * 60 * 1000);
    try {
      await upload('apply', file, preview.body.previewToken as string).expect(409);
    } finally {
      clock.mockRestore();
    }
    await request(app.getHttpServer())
      .post('/api/v1/admin/departments')
      .set(admin())
      .send({ source_key: 'other', name_en: 'Other' })
      .expect(201);
    await upload('apply', file, preview.body.previewToken as string).expect(409);
    expect(
      (await request(app.getHttpServer()).get('/api/v1/admin/departments').set(admin())).body.total,
    ).toBe(1);
  });

  it('accepts plain XLSX values and rejects formula cells', async () => {
    const book = new Workbook(),
      sheet = book.addWorksheet('Departments');
    sheet.addRow(departmentHeaders);
    sheet.addRow(['xlsx:1', 'Pediatrics', 'बाल रोग', '', '', true]);
    const file = Buffer.from(await book.xlsx.writeBuffer());
    const preview = await upload('preview', file, undefined, 'departments.xlsx').expect(201);
    await upload('apply', file, preview.body.previewToken as string, 'departments.xlsx').expect(
      201,
    );
    sheet.getCell('B2').value = { formula: '1+1', result: 2 };
    await upload(
      'preview',
      Buffer.from(await book.xlsx.writeBuffer()),
      undefined,
      'departments.xlsx',
    ).expect(400);
  });

  it('serves the portal navigation and its dedicated CSP-compatible script', async () => {
    const page = await request(app.getHttpServer()).get('/admin').expect(200);
    expect(page.text).toContain('data-page="departments"');
    expect(page.text).toContain('/admin-assets/medical-departments.js');
    const script = await request(app.getHttpServer())
      .get('/admin-assets/medical-departments.js')
      .expect(200);
    expect(script.text).toContain('/admin/departments/import/preview');
    expect(script.text).toContain("payload.append('previewToken'");
  });
});
