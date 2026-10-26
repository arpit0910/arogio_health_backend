// Disposable local API with actual Google verification and no hosted DB access.
require('reflect-metadata');
const { randomBytes } = require('node:crypto');
const { readFile, readdir } = require('node:fs/promises');
const { join } = require('node:path');

process.env.NODE_ENV = 'development';
process.env.PORT = process.env.AROGIO_LOCAL_API_PORT || '3001';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:5432/local_validation';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('base64url');
process.env.JWT_ISSUER = 'arogio-local-validation';
process.env.JWT_AUDIENCE = 'arogio-local-app';
process.env.GOOGLE_CLIENT_IDS = '987857172312-fil8ani3esi0j9gsg095c6tg1utcbm2j.apps.googleusercontent.com';
process.env.CORS_ORIGINS = 'http://localhost:8081,http://127.0.0.1:8081';
process.env.LOG_LEVEL = 'warn';
process.env.SWAGGER_ENABLED = 'false';

async function main() {
  const { PGlite } = require('@electric-sql/pglite');
  const { drizzle } = require('drizzle-orm/pglite');
  const { Test } = require('@nestjs/testing');
  const { AppModule } = require('../dist/app.module');
  const { DatabaseService } = require('../dist/database/database.service');
  const { configureApplication } = require('../dist/bootstrap/configure-application');
  const schema = require('../dist/database/schema');
  const database = new PGlite();
  const directory = join(__dirname, '..', 'drizzle');
  for (const file of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    for (const statement of (await readFile(join(directory, file), 'utf8')).split('--> statement-breakpoint')) {
      if (statement.trim()) await database.exec(statement);
    }
  }
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService)
    .useValue({
      db: drizzle(database, { schema }),
      ping: async () => { await database.query('select 1'); },
      onApplicationShutdown: () => database.close(),
    }).compile();
  const app = module.createNestApplication({ bodyParser: false });
  configureApplication(app);
  await app.listen(Number(process.env.PORT), '127.0.0.1');
  console.log(`Local validation API: http://127.0.0.1:${process.env.PORT}/api/v1`);
  console.log('Real Google token verification enabled. Database is disposable memory; hosted data is not used.');
}

main().catch(error => {
  console.error('Local validation API could not start:', error.message);
  process.exitCode = 1;
});
