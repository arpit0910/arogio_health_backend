// Explicit application-data reset. No credentials, row contents or automatic seeds are printed.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('dotenv');
const catalog = require('../../database/table-catalog.json');
const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const target = option('--target');
const reset = args.includes('--reset');
const known = new Set(catalog.flatMap(item => [item.table, item.previousTable]));
const quote = name => '"' + name.replaceAll('"', '""') + '"';

async function operate(query, identity) {
  const result = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
  const names = result.rows.map(row => row.table_name);
  const unknown = names.filter(name => !known.has(name));
  if (unknown.length) throw new Error('UNRECOGNIZED_TABLES:' + unknown.join(','));
  if (!names.length) throw new Error('NO_APPLICATION_TABLES');
  const count = async () => Object.fromEntries(await Promise.all(names.map(async name => [name, Number((await query(`SELECT count(*)::text AS count FROM "public".${quote(name)}`)).rows[0].count)])));
  const before = await count();
  if (!reset) return { target, ...identity, mode: 'inspect', applicationTables: names.length, rows: before };
  if (option('--confirm-database') !== identity.database) throw new Error('DATABASE_CONFIRMATION_REQUIRED');
  if (target === 'hosted' && option('--confirm-host') !== identity.host) throw new Error('HOST_CONFIRMATION_REQUIRED');
  // All application tables are included in one TRUNCATE. Intentionally omit CASCADE:
  // unexpected dependencies outside this application must block and roll back.
  await query(`TRUNCATE TABLE ${names.map(name => '"public".' + quote(name)).join(', ')} RESTART IDENTITY`);
  const after = await count();
  if (Object.values(after).some(value => value !== 0)) throw new Error('RESET_VERIFICATION_FAILED');
  return { target, ...identity, mode: 'reset', applicationTables: names.length, removedRows: Object.values(before).reduce((sum, value) => sum + value, 0), remainingRows: 0, rows: after, migrationHistoryRetained: true, seeded: false };
}

async function local() {
  const { PGlite } = require('@electric-sql/pglite');
  const directory = path.join(root, '.local/database');
  if (!fs.existsSync(directory) && !(reset && args.includes('--initialize-local'))) throw new Error('LOCAL_DATABASE_NOT_FOUND');
  const database = new PGlite(directory);
  try {
    if (args.includes('--migrate-local')) {
      if (!reset) throw new Error('LOCAL_MIGRATION_REQUIRES_RESET');
      const { migrateLocal } = require('./migrate-local.cjs');
      await migrateLocal(database, path.join(root, 'database/migrations'));
    }
    return await database.transaction(async tx => operate(sql => tx.query(sql), { database: 'arogio_local', storage: '.local/database' }));
  } finally { await database.close(); }
}

async function hosted() {
  const { Client } = require('pg');
  const envFile = path.join(root, '.env.production');
  if (!fs.existsSync(envFile)) throw new Error('PRODUCTION_ENVIRONMENT_NOT_FOUND');
  const values = parse(fs.readFileSync(envFile));
  if (!values.DATABASE_URL) throw new Error('PRODUCTION_DATABASE_URL_MISSING');
  const url = new URL(values.DATABASE_URL);
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) throw new Error('HOSTED_TARGET_IS_LOCAL');
  const database = decodeURIComponent(url.pathname.slice(1));
  const settings = { connectionString: values.DATABASE_URL, connectionTimeoutMillis: 15000, query_timeout: 60000, application_name: 'arogio-explicit-data-reset' };
  if (url.hostname.endsWith('.pooler.supabase.com') || url.hostname.endsWith('.supabase.co')) {
    const verified = new URL(url);
    for (const name of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) verified.searchParams.delete(name);
    settings.connectionString = verified.toString();
    settings.ssl = { ca: fs.readFileSync(path.join(root, 'database/certificates/supabase-root-2021.crt'), 'utf8'), rejectUnauthorized: true, servername: url.hostname };
  }
  const client = new Client(settings);
  try {
    await client.connect();
    const actual = (await client.query('SELECT current_database() AS name')).rows[0].name;
    if (actual !== database) throw new Error('CONNECTED_DATABASE_MISMATCH');
    await client.query(reset ? 'BEGIN' : 'BEGIN READ ONLY');
    try {
      await client.query("SET LOCAL lock_timeout = '10s'");
      const result = await operate(sql => client.query(sql), { database, host: url.hostname });
      await client.query(reset ? 'COMMIT' : 'ROLLBACK');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } finally { await client.end(); }
}

async function main() {
  if (!['local', 'hosted'].includes(target)) throw new Error('USE_TARGET_LOCAL_OR_HOSTED');
  const result = await (target === 'local' ? local() : hosted());
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => {
  const safe = /^[A-Z_]+(?::[a-z0-9_,]+)?$/.test(error.message) ? error.message : error.code || 'DATABASE_OPERATION_FAILED';
  console.error(JSON.stringify({ target, operation: reset ? 'reset' : 'inspect', failed: safe, dataResetCommitted: false }));
  process.exitCode = 1;
});
