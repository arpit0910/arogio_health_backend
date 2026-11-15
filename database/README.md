# Database: start here

| Need | File/folder |
| --- | --- |
| SQL migration files and explanations | [migrations/README.md](migrations/README.md) |
| Drizzle journal and schema snapshots | [migrations/meta/](migrations/meta/) |
| Current table definitions | [src/database/schema/index.ts](../src/database/schema/index.ts) |
| Named tables and feature ownership | [TABLES.md](TABLES.md) |
| Explicit data inspection and reset | [RESET.md](RESET.md) |
| Generator configuration | [drizzle.config.ts](../drizzle.config.ts) |
| PostgreSQL migration runner | [src/database/migrate.ts](../src/database/migrate.ts) |
| Shared migration location resolver | [src/database/migration-path.ts](../src/database/migration-path.ts) |
| Super-admin seed | [src/database/seeds/seed-super-admin.ts](../src/database/seeds/seed-super-admin.ts) |
| Local PGlite migrator | [scripts/database/migrate-local.cjs](../scripts/database/migrate-local.cjs) |
| Authentication schema/history diagnostics | [scripts/database/check-database.cjs](../scripts/database/check-database.cjs) |

## Inspect

`npm run db:list` prints the local folder and migration filenames without reading credentials or connecting to a database. The SQL files and `meta/` folder together are the migration history. There is one authoritative copy, in `database/migrations/`.

## Change a schema

1. Edit the table's descriptively named file in `src/database/schema/` and export new tables from `index.ts` when needed.
2. Run `npm run db:generate -- --name=descriptive_change_name` with the required environment configured.
3. Review the new SQL and generated metadata. Keep existing SQL files, journal timestamps and snapshots intact.
4. Run `npm run db:check`, `npm run test:migrations` and `npm run test:e2e`.
5. Apply pending changes to the intended PostgreSQL database with `npm run db:migrate`.

The PostgreSQL runner requires `DATABASE_URL`. Local commands load `.env` through the existing dotenv setup, or use environment variables supplied by your shell. Production commands explicitly load `.env.production` when it exists. Do not put connection strings in documentation or source control.

## Production

```sh
npm run build
npm run db:migrate:production
npm run seed:super-admin:production
```

Migrations change the configured database. The seed explicitly creates/configures the super-admin account using its configured environment; run it only when that action is intended. Neither operation runs automatically on API startup. Deploy `database/migrations/` with `dist/`; the compiled runner resolves the migration folder from its own location rather than the shell's working directory.

The Drizzle database tracking table remains `drizzle.__drizzle_migrations`. Existing SQL files and snapshots retain their deployed identities. Migration `0018_descriptive_domain_names` adds the new application table names; deploy it with the matching rebuilt backend. Use the updated hosting rules to keep the `database/` folder private.

## Local validation

`npm run start:local:validation` uses a disposable PGlite database. `npm run start:local` keeps its local data under `.local/database`; it is not the SQL migration folder and should not be moved into source control. These runners use the same committed migration history through the PGlite adapter.
