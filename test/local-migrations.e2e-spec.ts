import { PGlite } from '@electric-sql/pglite';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const { migrateLocal } = createRequire(__filename)('../scripts/database/migrate-local.cjs') as {
  migrateLocal: (database: PGlite, folder: string) => Promise<void>;
};

describe('Local database migration runner', () => {
  it('applies historical batched seeds and the dose table once without changing deployed migrations', async () => {
    const database = new PGlite();
    try {
      await migrateLocal(database, join(process.cwd(), 'database', 'migrations'));
      const before = await database.query(
        'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
      );
      await migrateLocal(database, join(process.cwd(), 'database', 'migrations'));
      expect(
        (
          await database.query(
            'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
          )
        ).rows,
      ).toEqual(before.rows);
      expect(
        (await database.query('SELECT count(*)::int AS count FROM meditation_library_items')).rows,
      ).toEqual([{ count: 6 }]);
      expect(
        (await database.query('SELECT count(*)::int AS count FROM medicine_dose_logs')).rows,
      ).toEqual([{ count: 0 }]);
    } finally {
      await database.close();
    }
  }, 30000);
});
