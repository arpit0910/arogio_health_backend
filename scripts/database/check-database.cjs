// Metadata-only diagnostic. Does not read account rows or change the database.
require('dotenv/config');
const { Client } = require('pg');
const { getTableConfig } = require('drizzle-orm/pg-core');
const { readMigrationFiles } = require('drizzle-orm/migrator');
const { resolve } = require('node:path');
const {
  userAccounts, authenticationSessions, authenticationIdentities,
  medicalDepartments, medicalDiseases, careDirectoryEntries,
  doctors, hospitals, healthArticles, bloodBankDirectoryEntries,
} = require('../../dist/database/schema');

// Cross-check the compiled release against the final column names in migration 0032.
const directoryTables = [
  [medicalDepartments, ['source_key']],
  [medicalDiseases, ['source_key']],
  [careDirectoryEntries, ['source_key', 'source_url']],
  [doctors, ['source_key', 'source_url']],
  [hospitals, ['source_key', 'source_url']],
  [healthArticles, ['source_id']],
  [bloodBankDirectoryEntries, ['source_id', 'source_url']],
];

function tableColumns(table) {
  const config = getTableConfig(table);
  return { name: config.name, columns: config.columns.map(column => column.name) };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in this environment.');
  const directories = directoryTables.map(([table, legacy]) => ({ ...tableColumns(table), legacy }));
  const releaseSchemaMismatch = directories.flatMap(({ name, columns, legacy }) => [
    ...(!columns.includes('record_key') ? [{ table: name, missingColumn: 'record_key' }] : []),
    ...legacy.filter(column => columns.includes(column)).map(column => ({ table: name, legacyColumn: column })),
  ]);
  const expected = [
    ...[userAccounts, authenticationSessions, authenticationIdentities].map(tableColumns),
    ...directories.map(({ name, columns, legacy }) => ({
      name, columns: [...new Set([...columns.filter(column => !legacy.includes(column)), 'record_key'])],
    })),
  ];
  const migrationsFolder = resolve(__dirname, '../../database/migrations');
  const { entries } = require(resolve(migrationsFolder, 'meta/_journal.json'));
  const migrations = readMigrationFiles({ migrationsFolder });
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
  });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const result = await client.query(
      'SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = ANY($2::text[])',
      ['public', expected.map(table => table.name)],
    );
    const missing = expected.flatMap(table => {
      const columns = result.rows.filter(row => row.table_name === table.name).map(row => row.column_name);
      if (!columns.length) return [{ table: table.name, problem: 'Table missing or inaccessible' }];
      return table.columns.filter(column => !columns.includes(column))
        .map(column => ({ table: table.name, missingColumn: column }));
    });
    const legacyDirectoryColumns = result.rows.filter(row =>
      directories.some(table => table.name === row.table_name && table.legacy.includes(row.column_name)));
    const history = await client.query('SELECT to_regclass($1)::text AS migration_table', ['drizzle.__drizzle_migrations']);
    const migrationHistoryPresent = Boolean(history.rows[0].migration_table);
    const { rows: applied } = migrationHistoryPresent
      ? await client.query('SELECT hash, created_at FROM drizzle.__drizzle_migrations')
      : { rows: [] };
    const byTimestamp = new Map(applied.map(row => [Number(row.created_at), row.hash]));
    const lastApplied = Math.max(0, ...byTimestamp.keys());
    const migrationState = { pending: [], missingFromHistory: [], hashMismatch: [] };
    for (const [index, migration] of migrations.entries()) {
      const existing = byTimestamp.get(migration.folderMillis);
      const tag = entries[index].tag;
      if (existing == null) {
        (migration.folderMillis > lastApplied ? migrationState.pending : migrationState.missingFromHistory).push(tag);
      } else if (existing !== migration.hash) migrationState.hashMismatch.push(tag);
    }
    const schemaOk = !missing.length && !legacyDirectoryColumns.length;
    console.log(JSON.stringify({
      connection: 'passed', schema: schemaOk ? 'passed' : 'failed', missing,
      legacyDirectoryColumns, releaseSchemaMismatch, migrationHistoryPresent, ...migrationState,
    }, null, 2));
    if (!schemaOk || releaseSchemaMismatch.length || Object.values(migrationState).some(list => list.length)) process.exitCode = 1;
    await client.query('ROLLBACK');
  } catch (error) {
    // Driver messages/queries can contain credentials or user data; print codes only.
    console.error(JSON.stringify({ connectionOrSchemaCheck: 'failed', code: error.code || 'UNKNOWN_DATABASE_ERROR', releaseSchemaMismatch }));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
