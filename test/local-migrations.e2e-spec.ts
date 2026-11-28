import { PGlite } from '@electric-sql/pglite';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
const { migrateLocal } = createRequire(__filename)('../scripts/database/migrate-local.cjs') as {
  migrateLocal: (database: PGlite, folder: string) => Promise<void>;
};

describe('Local database migration runner', () => {
  it('renames legacy directory keys while preserving catalog links and blood-bank contact details', async () => {
    const database = new PGlite();
    try {
      const migrations = readMigrationFiles({ migrationsFolder: join(process.cwd(), 'database', 'migrations') });
      const renameIndex = migrations.findIndex(migration => migration.sql.some(
        statement => statement.includes('ALTER TABLE "medical_departments" RENAME COLUMN "source_key" TO "record_key"'),
      ));
      expect(renameIndex).toBeGreaterThan(0);
      for (const migration of migrations.slice(0, renameIndex))
        for (const statement of migration.sql) if (statement.trim()) await database.exec(statement);
      await database.exec(`
        INSERT INTO medical_departments (id, source_key, name_en, is_active)
          VALUES ('11111111-1111-4111-8111-111111111111', 'department-1', 'Test department', true);
        INSERT INTO medical_diseases (source_key, name_en, department_id, is_active)
          VALUES ('disease-1', 'Test condition', '11111111-1111-4111-8111-111111111111', true);
        INSERT INTO blood_bank_directory_entries
          (source_id, source_url, name_en, city, state, address_en, phone, latitude, longitude, is_active)
          VALUES ('bank-1', 'https://example.test/bank', 'Test blood bank', 'Jaipur', 'Rajasthan',
            'Test address', '9000000000', 26.9, 75.8, true);
        INSERT INTO care_directory_entries
          (id, source_key, source_url, kind, name, city, phone, details, published, reviewed_at)
          VALUES ('22222222-2222-4222-8222-222222222222', 'care-1', 'https://example.test/care',
            'lab', 'Test lab', 'Jaipur', '9000000001', '{}', true, now());
        INSERT INTO care_directory_corrections (entry_id, message)
          VALUES ('22222222-2222-4222-8222-222222222222', 'Test correction');
      `);
      for (const statement of migrations[renameIndex]!.sql)
        if (statement.trim()) await database.exec(statement);
      const { rows } = await database.query(`
        SELECT diseases.record_key AS disease, departments.record_key AS department
        FROM medical_diseases AS diseases
        JOIN medical_departments AS departments ON departments.id = diseases.department_id
        WHERE diseases.is_active AND departments.is_active
      `);
      expect(rows).toEqual([{ disease: 'disease-1', department: 'department-1' }]);
      const banks = await database.query(`
        SELECT record_key, phone, latitude, longitude, is_active
        FROM blood_bank_directory_entries WHERE record_key = 'bank-1'
      `);
      expect(banks.rows).toEqual([
        { record_key: 'bank-1', phone: '9000000000', latitude: 26.9, longitude: 75.8, is_active: true },
      ]);
      const care = await database.query(`
        SELECT entry.record_key, entry.phone, entry.published, correction.message
        FROM care_directory_entries AS entry
        JOIN care_directory_corrections AS correction ON correction.entry_id = entry.id
        WHERE entry.record_key = 'care-1'
      `);
      expect(care.rows).toEqual([
        { record_key: 'care-1', phone: '9000000001', published: true, message: 'Test correction' },
      ]);
      const legacy = await database.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('blood_bank_directory_entries', 'care_directory_entries')
          AND column_name IN ('source_id', 'source_key', 'source_url')
      `);
      expect(legacy.rows).toEqual([]);
    } finally { await database.close(); }
  }, 30000);
  it('applies historical batched seeds and the dose table once without changing deployed migrations', async () => {
    const database = new PGlite();
    try {
      await migrateLocal(database, join(process.cwd(), 'database', 'migrations'));
      const before = await database.query(
        'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
      );
      const seedCount = 'SELECT count(*)::int AS count FROM meditation_library_items';
      const seeded = await database.query<{ count: number }>(seedCount);
      expect(seeded.rows[0]!.count).toBeGreaterThanOrEqual(6);
      await migrateLocal(database, join(process.cwd(), 'database', 'migrations'));
      expect(
        (
          await database.query(
            'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
          )
        ).rows,
      ).toEqual(before.rows);
      expect((await database.query(seedCount)).rows).toEqual(seeded.rows);
      expect(
        (await database.query('SELECT count(*)::int AS count FROM medicine_dose_logs')).rows,
      ).toEqual([{ count: 0 }]);
    } finally {
      await database.close();
    }
  }, 30000);
});
