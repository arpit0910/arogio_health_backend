# Inspecting and resetting application data

## Current reset result

On 15 November 2026, the user authorized clearing both databases, then chose **local only for now** after the hosted credentials were rejected (`28P01`). The persistent local PGlite database at `.local/database` was rebuilt from all 19 migrations and cleared. A separate reopening/inspection verified **19 application tables, zero rows in every table**. No administrator, account, directory, article or meditation content was seeded into the final database.

The original local store could not open cleanly, so its authorized reset recreated the database files. Migration history is present in the rebuilt store. Environment files, credentials and source assets were retained. The hosted database was **not changed**. Its credentials in `.env.production` must be corrected before its reset can proceed.

## Read-only inspection

```sh
npm run db:inspect -- --target local
npm run db:inspect -- --target hosted
```

The hosted target explicitly reads `.env.production`. The local target is `.local/database`, not a PostgreSQL URL or the SQL migration folder. Output contains table counts and target identity, never credentials or row contents.

## Explicit reset

The following commands permanently clear application data. They do not seed replacement data:

```sh
npm run db:reset -- --target local --confirm-database arogio_local
```

For a hosted reset, provide `--target hosted`, `--confirm-database` and `--confirm-host` matching the inspected target. Keep the connection string in `.env.production`; do not paste secrets into command arguments, documentation or chat.

The utility accepts only names in [table-catalog.json](table-catalog.json), including their pre-migration names. It rejects unrecognized public tables. It truncates all application tables in one transaction, verifies every count is zero, and commits only when verification succeeds. It omits `CASCADE` so unexpected external foreign-key dependencies block the reset. PostgreSQL roles, Supabase internal schemas and `drizzle.__drizzle_migrations` remain.

## Naming migration and deployment

The local database has `0018_descriptive_domain_names` applied. Its old-to-new table names are in [TABLES.md](TABLES.md). Deploy the rebuilt backend and the naming migration together; hosted code still needs its old names until that coordinated rollout. The hosted reset utility supports either naming version and does not automatically migrate the hosted database.

Normal API startup does not create an administrator. Use the explicit `seed:super-admin` command only when you intend to create the new administrator. Historical migrations contain six meditation seed rows; a reset after migration removes them, and the retained migration journal prevents them from reappearing on the next persistent startup.

Device bookmarks, sensor history and installed-app storage are separate from these backend databases and are not erased by this utility.
