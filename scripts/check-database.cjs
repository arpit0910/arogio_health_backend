// Metadata-only diagnostic. Does not read account rows or change the database.
require('dotenv/config');
const { Client } = require('pg');
const { getTableConfig } = require('drizzle-orm/pg-core');
const { users, authSessions, authIdentities } = require('../dist/database/schema');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured in this environment.');
  const expected = [users, authSessions, authIdentities].map(getTableConfig);
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
      return table.columns.filter(column => !columns.includes(column.name))
        .map(column => ({ table: table.name, missingColumn: column.name }));
    });
    const migrations = await client.query('SELECT to_regclass($1)::text AS migration_table', ['drizzle.__drizzle_migrations']);
    console.log(JSON.stringify({ connection: 'passed', schema: missing.length ? 'failed' : 'passed', missing, migrationHistoryPresent: Boolean(migrations.rows[0].migration_table) }, null, 2));
    if (missing.length) process.exitCode = 1;
    await client.query('ROLLBACK');
  } catch (error) {
    // Driver messages/queries can contain credentials or user data; print codes only.
    console.error(JSON.stringify({ connectionOrSchemaCheck: 'failed', code: error.code || 'UNKNOWN_DATABASE_ERROR' }));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
