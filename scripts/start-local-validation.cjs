// Real local API: persistent embedded PostgreSQL with --persist, disposable otherwise.
require('reflect-metadata');
const { randomBytes } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const { existsSync, readFileSync } = require('node:fs');
const { parseEnv } = require('node:util');
const { join } = require('node:path');
const root = join(__dirname, '..');
const persistent = process.argv.includes('--persist');
if (persistent && existsSync(join(root, '.env.local'))) Object.assign(process.env, parseEnv(readFileSync(join(root, '.env.local'), 'utf8')));
process.env.NODE_ENV = 'development';
process.env.PORT = process.env.AROGIO_LOCAL_API_PORT || (persistent ? process.env.PORT : undefined) || '3001';
// Config validation only: DatabaseService is replaced before the app is created.
process.env.DATABASE_URL = 'postgresql://local:local@127.0.0.1:5432/arogio_local';
if (!persistent) process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('base64url');
if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) throw new Error('Set a local JWT_ACCESS_SECRET of at least 32 characters in .env.local.');
process.env.JWT_ISSUER = persistent ? 'arogio-local-api' : 'arogio-local-validation';
process.env.JWT_AUDIENCE = 'arogio-local-app';
process.env.GOOGLE_CLIENT_IDS = '987857172312-fil8ani3esi0j9gsg095c6tg1utcbm2j.apps.googleusercontent.com';
process.env.CORS_ORIGINS = 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:8082,http://127.0.0.1:8082';
process.env.LOG_LEVEL = 'warn';
process.env.SWAGGER_ENABLED = persistent ? 'true' : 'false';

async function main() {
  const { PGlite } = require('@electric-sql/pglite');
  const { drizzle } = require('drizzle-orm/pglite');
  const { migrate } = require('drizzle-orm/pglite/migrator');
  const { Test } = require('@nestjs/testing');
  const { AppModule } = require('../dist/app.module');
  const { DatabaseService } = require('../dist/database/database.service');
  const { configureApplication } = require('../dist/bootstrap/configure-application');
  const schema = require('../dist/database/schema');
  if (persistent) await mkdir(join(root, '.local'), { recursive: true });
  const database = new PGlite(persistent ? join(root, '.local', 'database') : undefined);
  const db = drizzle(database, { schema });
  await migrate(db, { migrationsFolder: join(root, 'drizzle') });
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DatabaseService).useValue({
    db, ping: async () => { await database.query('select 1'); }, onApplicationShutdown: () => database.close(),
  }).compile();
  const app = module.createNestApplication({ bodyParser: false });
  configureApplication(app);
  await app.listen(Number(process.env.PORT), '127.0.0.1');
  console.log(`Local API: http://127.0.0.1:${process.env.PORT}/api/v1`);
  console.log(`Google token verification is real. Storage: ${persistent ? '.local/database (persists across restarts)' : 'disposable memory'}. Hosted databases are not used.`);
}
main().catch(error => { console.error('Local API could not start:', error.message); process.exitCode = 1; });
