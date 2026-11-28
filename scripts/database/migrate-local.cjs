// Local PGlite supports SQL batches through exec, not prepared query calls.
// Historical seed migrations contain batches; leave their deployed hashes intact.
const { readMigrationFiles } = require('drizzle-orm/migrator');

async function migrateLocal(database, migrationsFolder) {
  const migrations = readMigrationFiles({ migrationsFolder });
  await database.exec(`CREATE SCHEMA IF NOT EXISTS "drizzle";
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
    );`);
  await database.transaction(async (tx) => {
    const { rows } = await tx.query(
      'SELECT created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1',
    );
    const latest = Number(rows[0]?.created_at ?? -1);
    for (const migration of migrations) {
      if (migration.folderMillis <= latest) continue;
      for (const statement of migration.sql) if (statement.trim()) await tx.exec(statement);
      await tx.query(
        'INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
        [migration.hash, migration.folderMillis],
      );
    }
  });
}
module.exports = { migrateLocal };
