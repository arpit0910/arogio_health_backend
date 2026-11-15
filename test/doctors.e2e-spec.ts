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
import { doctorHeaders as hospitalHeaders } from '../src/modules/doctors/imports/doctors.import';

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
describe('Structured doctors', () => {
  let app: NestExpressApplication, database: PGlite, token: string, ordinary: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const upload = (
    action: string,
    buffer: Buffer,
    previewToken?: string,
    filename = 'hospitals.csv',
  ) => {
    const call = request(app.getHttpServer())
      .post(`/api/v1/admin/doctors/import/${action}`)
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

  const createDepartment = async () =>
    (
      await request(app.getHttpServer())
        .post('/api/v1/admin/departments')
        .set(auth())
        .send({ source_key: 'test:dept', name_en: 'Test specialty', is_active: true })
        .expect(201)
    ).body as { id: string; version: number };
  const createHospital = async () =>
    (
      await request(app.getHttpServer())
        .post('/api/v1/admin/hospitals')
        .set(auth())
        .send({
          source_key: 'test:hospital',
          name_en: 'Test hospital',
          city: 'Delhi',
          state: 'Delhi',
          address_line1: 'Synthetic address',
          phone_1: '+919000000000',
          source_url: 'https://example.test/hospital',
        })
        .expect(201)
    ).body as { id: string; version: number };
  const createDoctor = async (body: object) =>
    (
      await request(app.getHttpServer())
        .post('/api/v1/admin/doctors')
        .set(auth())
        .send(body)
        .expect(201)
    ).body as { id: string; version: number };
  it('protects administration and provides empty public lists and templates', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/doctors')
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await request(app.getHttpServer()).get('/api/v1/admin/doctors').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/admin/doctors')
      .set('Authorization', `Bearer ${ordinary}`)
      .send(draft())
      .expect(403);
    for (const format of ['csv', 'xlsx'])
      await request(app.getHttpServer())
        .get('/api/v1/admin/doctors/template?format=' + format)
        .set(auth())
        .expect(200)
        .expect('Content-Disposition', new RegExp('doctors-template.' + format));
  });
  it('maintains one care identity, relations, recorded schedules and review visibility', async () => {
    const d = await createDepartment(),
      h = await createHospital();
    const row = await createDoctor({
      ...draft(),
      department_ids: [d.id],
      affiliations: [
        {
          hospital_id: h.id,
          days_of_week: [1, 3],
          start_time: '09:00',
          end_time: '13:00',
          consultation_fee: 700,
        },
      ],
    });
    await request(app.getHttpServer())
      .get('/api/v1/public/doctors/' + row.id)
      .expect(404);
    const admin = await request(app.getHttpServer())
      .get('/api/v1/admin/doctors/' + row.id)
      .set(auth())
      .expect(200);
    expect(admin.body.affiliations[0]).toMatchObject({
      hospital_id: h.id,
      days_of_week: [1, 3],
      start_time: '09:00',
      consultation_fee: 700,
    });
    await request(app.getHttpServer())
      .post(`/api/v1/admin/doctors/${row.id}/review`)
      .set(auth())
      .send(review(1))
      .expect(201);
    const pub = await request(app.getHttpServer())
      .get('/api/v1/public/doctors?city=Delhi&department_id=' + d.id)
      .expect(200);
    expect(pub.body.total).toBe(1);
    expect(pub.body.items[0].reviewEvidence).toBeUndefined();
    expect(pub.body.items[0].affiliations).toEqual([]);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/hospitals/${h.id}/review`)
      .set(auth())
      .send(review(1))
      .expect(201);
    const detail = await request(app.getHttpServer())
      .get('/api/v1/public/doctors/' + row.id)
      .expect(200);
    expect(detail.body.affiliations[0].hospital_id).toBe(h.id);
    const care = await request(app.getHttpServer())
      .get('/api/v1/care?kind=doctor&city=Delhi')
      .expect(200);
    expect(care.body.items[0]).toMatchObject({
      id: row.id,
      verification: 'source-reviewed',
      details: {
        qualifications: 'MBBS',
        registration: 'TEST-123',
        specialties: ['Test specialty'],
      },
    });
    await request(app.getHttpServer())
      .patch('/api/v1/admin/doctors/' + row.id)
      .set(auth())
      .send({ expectedVersion: 2, summary_en: 'Updated biography' })
      .expect(200);
    const edited = await request(app.getHttpServer())
      .get('/api/v1/admin/doctors/' + row.id)
      .set(auth())
      .expect(200);
    expect(edited.body.department_ids).toEqual([d.id]);
    expect(edited.body.affiliations).toHaveLength(1);
    expect(edited.body.consultation_fee).toBe(500);
    await request(app.getHttpServer())
      .get('/api/v1/public/doctors/' + row.id)
      .expect(404);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/doctors/' + row.id)
      .set(auth())
      .send({ expectedVersion: 2, name_en: 'Stale edit' })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/hospitals/${h.id}?expected_version=2`)
      .set(auth())
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/doctors/${row.id}?expected_version=3`)
      .set(auth())
      .expect(200);
    expect((await database.query('select * from doctor_departments')).rows).toHaveLength(0);
    expect((await database.query('select * from care_provider_affiliations')).rows).toHaveLength(0);
  });
  it('blocks unknown links, invalid schedules and incomplete publication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/doctors')
      .set(auth())
      .send({ ...draft(), source_url: 'invalid' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/admin/doctors')
      .set(auth())
      .send({ ...draft(), department_ids: ['00000000-0000-4000-8000-000000000000'] })
      .expect(400);
    const h = await createHospital();
    await request(app.getHttpServer())
      .post('/api/v1/admin/doctors')
      .set(auth())
      .send({
        ...draft(),
        affiliations: [
          { hospital_id: h.id, days_of_week: [1], start_time: '15:00', end_time: '09:00' },
        ],
      })
      .expect(400);
    const row = await createDoctor(draft());
    await request(app.getHttpServer())
      .post(`/api/v1/admin/doctors/${row.id}/review`)
      .set(auth())
      .send(review(1))
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/care/${row.id}/review`)
      .set(auth())
      .send({
        ...review(1),
        expectedVersion: undefined,
        expectedUpdatedAt: new Date().toISOString(),
      })
      .expect(409);
  });
  it('hides a published doctor after department deactivation in both APIs', async () => {
    const d = await createDepartment(),
      row = await createDoctor({ ...draft(), department_ids: [d.id] });
    await request(app.getHttpServer())
      .post(`/api/v1/admin/doctors/${row.id}/review`)
      .set(auth())
      .send(review(1))
      .expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/departments/' + d.id)
      .set(auth())
      .send({ expectedVersion: 1, is_active: false })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/public/doctors/' + row.id)
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/care/' + row.id)
      .expect(404);
  });
  it('previews and applies CSV atomically with existing references, schedules and stable IDs', async () => {
    await createDepartment();
    await createHospital();
    const bytes = csv([
      {
        source_key: 'import:doctor',
        name_en: 'Imported doctor',
        city: 'Delhi',
        state: 'Delhi',
        department_source_keys: 'test:dept',
        hospital_source_keys: 'test:hospital',
        schedule_days: '1;3',
        schedule_start: '09:00',
        schedule_end: '11:00',
        qualifications: 'MBBS;MD',
      },
    ]);
    const p = await upload('preview', bytes).expect(201);
    expect(p.body).toMatchObject({ creates: 1, errorCount: 0 });
    await upload('apply', bytes, p.body.previewToken as string).expect(201);
    const listed = await request(app.getHttpServer())
      .get('/api/v1/admin/doctors')
      .set(auth())
      .expect(200);
    const id = listed.body.items[0].id as string;
    expect(listed.body.items[0]).toMatchObject({
      published: false,
      qualifications: ['MBBS', 'MD'],
      department_ids: [expect.any(String)],
    });
    await upload('apply', bytes, p.body.previewToken as string).expect(409);
    const again = await upload('preview', bytes).expect(201);
    expect(again.body.updates).toBe(1);
    await upload('apply', bytes, again.body.previewToken as string).expect(201);
    const updated = await request(app.getHttpServer())
      .get('/api/v1/admin/doctors/' + id)
      .set(auth())
      .expect(200);
    expect(updated.body.version).toBe(2);
    const bad = csv([
      { source_key: 'good', name_en: 'Good', city: 'Delhi', state: 'Delhi' },
      {
        source_key: 'bad',
        name_en: 'Bad',
        city: 'Delhi',
        state: 'Delhi',
        department_source_keys: 'missing',
      },
    ]);
    const invalid = await upload('preview', bad).expect(201);
    expect(invalid.body.previewToken).toBeNull();
    expect(invalid.body.errorCount).toBe(1);
    expect((await database.query('select * from doctors')).rows).toHaveLength(1);
  });
  it('binds preview to masters and exact file and rejects formula workbooks', async () => {
    const d = await createDepartment();
    const bytes = csv([
      {
        source_key: 'import:doctor',
        name_en: 'Import',
        city: 'Delhi',
        state: 'Delhi',
        department_source_keys: 'test:dept',
      },
    ]);
    const p = await upload('preview', bytes).expect(201);
    const db = drizzle(database, { schema });
    await db
      .update(schema.userAccounts)
      .set({ role: 'super_admin' })
      .where(eq(schema.userAccounts.email, 'doctor-reader@example.test'));
    await request(app.getHttpServer())
      .post('/api/v1/admin/doctors/import/apply')
      .set('Authorization', `Bearer ${ordinary}`)
      .field('previewToken', p.body.previewToken as string)
      .attach('file', bytes, 'doctors.csv')
      .expect(409);
    await db
      .update(schema.userAccounts)
      .set({ role: 'user' })
      .where(eq(schema.userAccounts.email, 'doctor-reader@example.test'));

    await upload(
      'apply',
      Buffer.concat([bytes, Buffer.from('\r\n')]),
      p.body.previewToken as string,
    ).expect(409);
    await request(app.getHttpServer())
      .patch('/api/v1/admin/departments/' + d.id)
      .set(auth())
      .send({ expectedVersion: 1, name_hi: '?????' })
      .expect(200);
    await upload('apply', bytes, p.body.previewToken as string).expect(409);
    const wb = new Workbook(),
      sheet = wb.addWorksheet('Doctors');
    sheet.addRow([...hospitalHeaders]);
    sheet.addRow(
      hospitalHeaders.map(
        (k) =>
          (
            ({
              source_key: 'xlsx',
              name_en: 'Xlsx doctor',
              city: 'Delhi',
              state: 'Delhi',
            }) as Record<string, string>
          )[k] || '',
      ),
    );
    sheet.getCell('B2').value = { formula: '1+1', result: 2 };
    await upload(
      'preview',
      Buffer.from(await wb.xlsx.writeBuffer()),
      undefined,
      'doctors.xlsx',
    ).expect(400);
  });
  it('accepts the legacy joined export without creating masters and merges distinct affiliations', async () => {
    const d = await createDepartment(),
      h = await createHospital();
    const second = await request(app.getHttpServer())
      .post('/api/v1/admin/hospitals')
      .set(auth())
      .send({
        source_key: 'legacy:hospital:2',
        name_en: 'Second hospital',
        city: 'Pune',
        state: 'Maharashtra',
      })
      .expect(201);
    const headers = [
      'doctor_id',
      'hospital_id',
      'registration_number',
      'first_name',
      'last_name',
      'department_name_en',
      'medical_council',
      'phone_1',
      'consultation_fee',
      'experience_years',
      'education_degrees',
      'city',
      'state',
      'languages_spoken',
      'is_verified',
      'hospital_name',
      'hospital_city',
      'doctor_hospital_role',
      'consultation_mode',
      'availability',
      'days_of_week',
      'start_time',
      'end_time',
      'hospital_consultation_fee',
      'gender',
      'doctor_hospital_link_id',
      'department_name_hi',
    ];
    const base: Record<string, string> = {
      doctor_id: '12',
      registration_number: 'LEGACY-12',
      first_name: 'Legacy',
      last_name: 'Doctor',
      department_name_en: 'Test specialty',
      medical_council: 'Test council',
      phone_1: '+919000000000',
      consultation_fee: '500',
      experience_years: '10',
      education_degrees: 'MBBS;MD',
      city: 'Delhi',
      state: 'Delhi',
      languages_spoken: 'Hindi;English',
      is_verified: '1',
      doctor_hospital_role: 'Consultant',
      consultation_mode: 'in_person',
      availability: 'Recorded hours',
      days_of_week: 'Monday;Wednesday',
      start_time: '09:00:00',
      end_time: '13:00:00',
      hospital_consultation_fee: '600',
      gender: 'Male',
      doctor_hospital_link_id: '501',
      department_name_hi: 'Legacy label',
    };
    const rows: Record<string, string>[] = [
      { ...base, hospital_id: h.id, hospital_name: 'Test hospital', hospital_city: 'Delhi' },
      {
        ...base,
        hospital_id: second.body.id as string,
        hospital_name: 'Second hospital',
        hospital_city: 'Pune',
        doctor_hospital_link_id: '502',
      },
    ];
    const bytes = Buffer.from(
      [headers, ...rows.map((row) => headers.map((k) => row[k] || ''))]
        .map((row) => row.map((v) => '"' + v.replace(/"/g, '""') + '"').join(','))
        .join('\r\n'),
    );
    const preview = await upload('preview', bytes).expect(201);
    expect(preview.body).toMatchObject({
      totalRows: 2,
      doctors: 1,
      creates: 1,
      errorCount: 0,
      ignoredVerificationFlags: 2,
      ignoredMetadataFields: 6,
    });
    await upload('apply', bytes, preview.body.previewToken as string).expect(201);
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/doctors')
      .set(auth())
      .expect(200);
    expect(list.body.items[0]).toMatchObject({
      source_key: 'swasthya:doctor:12',
      published: false,
      department_ids: [d.id],
    });
    expect(list.body.items[0].affiliations).toHaveLength(2);
    expect((await database.query('select * from hospitals')).rows).toHaveLength(2);
    expect((await database.query('select * from medical_departments')).rows).toHaveLength(1);
  });
  it('imports XLSX and prevents legacy edits or affiliation replacement of structured doctors', async () => {
    const wb = new Workbook(),
      sheet = wb.addWorksheet('Doctors');
    sheet.addRow([...hospitalHeaders]);
    const record: Record<string, string> = {
      source_key: 'xlsx:doctor',
      name_en: 'Xlsx doctor',
      city: 'Delhi',
      state: 'Delhi',
    };
    sheet.addRow(hospitalHeaders.map((k) => record[k] || ''));
    const bytes = Buffer.from(await wb.xlsx.writeBuffer());
    const p = await upload('preview', bytes, undefined, 'doctors.xlsx').expect(201);
    await upload('apply', bytes, p.body.previewToken as string, 'doctors.xlsx').expect(201);
    const rows = await request(app.getHttpServer())
        .get('/api/v1/admin/doctors')
        .set(auth())
        .expect(200),
      id = rows.body.items[0].id as string;
    const legacy = await request(app.getHttpServer())
      .get('/api/v1/admin/care/' + id)
      .set(auth())
      .expect(200);
    const base = legacy.body as Record<string, unknown>;
    await request(app.getHttpServer())
      .put('/api/v1/admin/care/' + id)
      .set(auth())
      .send({
        sourceKey: base.sourceKey,
        kind: 'doctor',
        name: base.name,
        city: 'Jaipur',
        sourceUrl: 'https://example.test/doctor',
        details: base.details,
        expectedUpdatedAt: base.updatedAt,
      })
      .expect(409);
    await request(app.getHttpServer())
      .put('/api/v1/admin/care/' + id + '/affiliations')
      .set(auth())
      .send({ hospitalIds: [], expectedUpdatedAt: base.updatedAt })
      .expect(409);
  });
});
