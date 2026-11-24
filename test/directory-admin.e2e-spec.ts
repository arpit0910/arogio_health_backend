import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { configureApplication } from '../src/bootstrap/configure-application';
import * as schema from '../src/database/schema';
const { migrateLocal } = createRequire(__filename)('../scripts/database/migrate-local.cjs') as { migrateLocal: (db: PGlite, directory: string) => Promise<void> };
const review = { reviewerName: 'Directory test reviewer', reviewerQualification: 'Test directory reviewer', evidence: 'Synthetic source and contact review for isolated automated tests.', confirmedDetails: true };
jest.setTimeout(60000);
describe('Directory status indexes and selected-record approvals', () => {
  let app: NestExpressApplication, database: PGlite, token: string, ordinary: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    database = new PGlite(); await migrateLocal(database, join(process.cwd(), 'database/migrations'));
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(ThrottlerStorage).useValue({ increment: () => Promise.resolve({ totalHits: 1, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 }) }).overrideProvider(DatabaseService).useValue({ db: drizzle(database, { schema }), ping: async () => {}, onApplicationShutdown: async () => {} }).compile();
    app = module.createNestApplication<NestExpressApplication>(); configureApplication(app); await app.init();
    for (const [index, email] of ['directory-admin@example.test', 'directory-user@example.test'].entries()) {
      const account = await request(app.getHttpServer()).post('/api/v1/auth/email/register').send({ email, password: 'Isolated-test-password-123!', fullName: 'Directory test' }).expect(201);
      if (index === 0) { token = account.body.accessToken as string; await database.query('update user_accounts set role=$1 where id=$2', ['super_admin', account.body.user.id as string]); }
      else ordinary = account.body.accessToken as string;
    }
  });
  afterAll(async () => { await app?.close(); await database?.close(); });
  afterEach(async () => { await database.exec('delete from administration_audit_logs; delete from blood_bank_directory_entries; delete from doctor_departments; delete from doctor_hospital_affiliations; delete from doctors; delete from hospitals; delete from care_directory_entries; delete from medical_departments;'); });
  const hospital = async (key: string, extra: Record<string, unknown> = {}) => (await request(app.getHttpServer()).post('/api/v1/admin/hospitals').set(auth()).send({ record_key: key, name_en: `Test ${key}`, city: 'Delhi', state: 'Delhi', address_line1: 'Synthetic address', phone_1: '+919000000000', ...extra }).expect(201)).body as { id: string; version: number };
  const bank = async (name: string, active = true) => (await request(app.getHttpServer()).post('/api/v1/admin/content/blood-banks').set(auth()).send({ name_en: name, city: 'Delhi', state: 'Delhi', address_en: 'Synthetic address', phone: '9000000000', is_active: active }).expect(201)).body as { id: string; updated_at: string };

  it('lists and approves 500 records in one request', async () => {
    await database.exec(`
      insert into blood_bank_directory_entries (record_key, name_en, city, state, address_en, phone)
      select 'batch-' || n, 'Test bank ' || n, 'Delhi', 'Delhi', 'Synthetic address', '9000000000'
      from generate_series(1, 501) as n
    `);
    for (const kind of ['hospitals', 'doctors', 'content/blood-banks']) {
      await request(app.getHttpServer()).get(`/api/v1/admin/${kind}?limit=500`).set(auth()).expect(200);
      await request(app.getHttpServer()).get(`/api/v1/admin/${kind}?limit=501`).set(auth()).expect(400);
    }
    const listPath = '/api/v1/admin/content/blood-banks?limit=500';
    const first = await request(app.getHttpServer()).get(listPath).set(auth()).expect(200);
    const second = await request(app.getHttpServer()).get(`${listPath}&page=2`).set(auth()).expect(200);
    expect(first.body.items).toHaveLength(500);
    expect(first.body.hasNext).toBe(true);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.hasNext).toBe(false);
    type BankVersion = { id: string; updated_at: string };
    const item = (row: BankVersion) => ({ id: row.id, expectedUpdatedAt: row.updated_at });
    const items = (first.body.items as BankVersion[]).map(item);
    const [remaining] = second.body.items as BankVersion[];
    const approvalPath = '/api/v1/admin/directory-approvals/blood-banks';
    await request(app.getHttpServer()).post(approvalPath).set(auth()).send({ items: [...items, item(remaining!)] }).expect(400);
    const result = await request(app.getHttpServer()).post(approvalPath).set(auth()).send({ items }).expect(201);
    expect(result.body).toMatchObject({ approved: 500, failed: 0 });
  });

  it('shows inactive and incomplete hospitals with accurate counts across pages and explicit missing fields', async () => {
    await hospital('complete'); await hospital('incomplete', { address_line1: '' });
    const hidden = await hospital('hidden');
    await request(app.getHttpServer()).post(`/api/v1/admin/hospitals/${hidden.id}/visibility`).set(auth()).send({ listed: false, expectedVersion: 1 }).expect(201);
    const all = await request(app.getHttpServer()).get('/api/v1/admin/hospitals?limit=1').set(auth()).expect(200);
    expect(all.body.summary).toMatchObject({ all: 3, active: 2, inactive: 1, incomplete: 1, draft: 3, ready: 1 });
    const inactive = await request(app.getHttpServer()).get('/api/v1/admin/hospitals?status=inactive').set(auth()).expect(200);
    expect(inactive.body.items).toHaveLength(1); expect(inactive.body.items[0].adminStatus.visibility).toBe('Inactive');
    const incomplete = await request(app.getHttpServer()).get('/api/v1/admin/hospitals?status=incomplete').set(auth()).expect(200);
    expect(incomplete.body.items[0].adminStatus.missingFields).toContain('Address');
    expect(incomplete.body.summary.all).toBe(3);
    const search = await request(app.getHttpServer()).get('/api/v1/admin/hospitals?search=hidden').set(auth()).expect(200);
    expect(search.body.summary.all).toBe(1); expect(search.body.summary.inactive).toBe(1);
  });
  it('approves only checked valid hospitals, reports individual failures and does not revive hidden rows', async () => {
    const valid = await hospital('valid'), invalid = await hospital('missing-address', { address_line1: '' }), hidden = await hospital('inactive');
    await request(app.getHttpServer()).post(`/api/v1/admin/hospitals/${hidden.id}/visibility`).set(auth()).send({ listed: false, expectedVersion: 1 }).expect(201);
    const result = await request(app.getHttpServer()).post('/api/v1/admin/directory-approvals/hospitals').set(auth()).send({ items: [{ id: valid.id, expectedVersion: 1 }, { id: invalid.id, expectedVersion: 1 }, { id: hidden.id, expectedVersion: 2 }] }).expect(201);
    expect(result.body).toMatchObject({ approved: 1, failed: 2 });
    await request(app.getHttpServer()).get(`/api/v1/public/hospitals/${hidden.id}`).expect(404);
    const stale = await request(app.getHttpServer()).post('/api/v1/admin/directory-approvals/hospitals').set(auth()).send({ items: [{ id: valid.id, expectedVersion: 1 }] }).expect(201);
    expect(stale.body).toMatchObject({ approved: 0, failed: 1 });
    expect((await request(app.getHttpServer()).get('/api/v1/admin/hospitals?status=approved').set(auth())).body.total).toBe(1);
  });
  it('protects bulk approval with administrator authorization, listing confirmation and duplicate/version validation', async () => {
    const row = await hospital('authorization'), items = [{ id: row.id, expectedVersion: 1 }];
    await request(app.getHttpServer()).post('/api/v1/admin/directory-approvals/hospitals').send({ ...review, items }).expect(401);
    await request(app.getHttpServer()).post('/api/v1/admin/directory-approvals/hospitals').set({ Authorization: `Bearer ${ordinary}` }).send({ ...review, items }).expect(403);
    await request(app.getHttpServer()).get('/api/v1/admin/directory-approvals/summary').set({ Authorization: `Bearer ${ordinary}` }).expect(403);
    for (const body of [{ ...review, items, confirmedDetails: false }, { ...review, items: [...items, ...items] }, { ...review, items: [{ id: row.id }] }]) await request(app.getHttpServer()).post('/api/v1/admin/directory-approvals/hospitals').set(auth()).send(body).expect(400);
    expect((await request(app.getHttpServer()).get(`/api/v1/admin/hospitals/${row.id}`).set(auth())).body.published).toBe(false);
  });
  it('includes inactive blood banks and approves checked banks in any city without activating inactive ones', async () => {
    const active = await bank('Test active bank'), inactive = await bank('Test inactive bank', false);
    const list = await request(app.getHttpServer()).get('/api/v1/admin/content/blood-banks?status=inactive').set(auth()).expect(200);
    expect(list.body.items).toHaveLength(1); expect(list.body.total).toBe(1);
    expect(list.body.summary).toMatchObject({ all: 2, active: 1, inactive: 1, incomplete: 0 });
    const result = await request(app.getHttpServer()).post('/api/v1/admin/directory-approvals/blood-banks').set(auth()).send({ items: [active, inactive].map(row => ({ id: row.id, expectedUpdatedAt: row.updated_at })) }).expect(201);
    expect(result.body).toMatchObject({ approved: 1, failed: 1 });
    const shown = await request(app.getHttpServer()).get('/api/v1/public/blood-banks').expect(200);
    expect(shown.body.items).toHaveLength(1); expect(shown.body.items[0].city).toBe('Delhi'); expect(shown.body.items[0].is_verified).toBe(true);
  });
  it('reports incomplete doctors, approves selected complete doctors and prevents stale replay', async () => {
    const department = await request(app.getHttpServer()).post('/api/v1/admin/departments').set(auth()).send({ record_key: 'test-department', name_en: 'Test department', is_active: true }).expect(201);
    const input = { record_key: 'complete-doctor', name_en: 'Test doctor', city: 'Delhi', state: 'Delhi', address_line1: 'Synthetic address', phone_1: '+919000000000', registration_number: 'TEST-123', medical_council: 'Test council', qualifications: ['MBBS'], department_ids: [department.body.id as string] };
    const valid = await request(app.getHttpServer()).post('/api/v1/admin/doctors').set(auth()).send(input).expect(201);
    await request(app.getHttpServer()).post('/api/v1/admin/doctors').set(auth()).send({ ...input, record_key: 'incomplete-doctor', registration_number: '', department_ids: [] }).expect(201);
    const list = await request(app.getHttpServer()).get('/api/v1/admin/doctors?status=incomplete').set(auth()).expect(200);
    expect(list.body.items).toHaveLength(1); expect(list.body.summary).toMatchObject({ all: 2, incomplete: 1, ready: 1 });
    expect(list.body.items[0].adminStatus.missingFields).toEqual(expect.arrayContaining(['Registration number', 'Active department']));
    const payload = { items: [{ id: valid.body.id as string, expectedVersion: 1 }] };
    expect((await request(app.getHttpServer()).post('/api/v1/admin/directory-approvals/doctors').set(auth()).send(payload).expect(201)).body.approved).toBe(1);
    expect((await request(app.getHttpServer()).post('/api/v1/admin/directory-approvals/doctors').set(auth()).send(payload).expect(201)).body.failed).toBe(1);
    const overview = await request(app.getHttpServer()).get('/api/v1/admin/directory-approvals/summary').set(auth()).expect(200);
    expect(overview.body.doctors.approved).toBe(1);
  });
});
