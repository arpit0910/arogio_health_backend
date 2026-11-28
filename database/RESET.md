# Inspecting and resetting application data

## Current reset result

On 15 November 2026, the user authorized clearing both databases, then chose **local only for now** after the hosted credentials were rejected (`28P01`). The persistent local PGlite database at `.local/database` was rebuilt from all 19 migrations and cleared. A separate reopening/inspection verified **19 application tables, zero rows in every table**. No administrator, account, directory, article or meditation content was seeded into the final database.

The original local store could not open cleanly, so its authorized reset recreated the database files. Migration history is present in the rebuilt store. Environment files, credentials and source assets were retained. The hosted database was **not changed**. Its credentials in `.env.production` must be corrected before its reset can proceed.

## Admin panel reset

Open **Database reset** in `/admin` as an active super-admin with a password. Enter the current password and select **Review database reset**. Confirm the displayed environment, host, database and table counts; type `RESET ALL APP DATA`, then select **Permanently reset database**. The review expires after ten minutes and is bound to that administrator, database and table counts. Changed counts require another review. The reset targets the database connected to the running API; it does not separately reset another local or hosted database.

All app records are deleted, including administrators, authentication sessions, database-stored images and audit logs. There is no automatic replacement administrator or seeded content. The schema, indexes, migration journal and provider-owned schemas remain. Unknown public tables or external foreign-key dependencies block the operation. Locks, truncation and zero-row verification run in one transaction; failure rolls back. Completion is recorded in server logs rather than recreating an audit row in the emptied database.

After success, configure `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (at least 16 characters) and optionally `SUPER_ADMIN_NAME` privately on the server, then run `npm run seed:super-admin:production`. For local development use `npm run seed:super-admin` with `.env.local`. These commands recreate admin access only; they do not restore deleted records. Adding this feature does not execute a reset or deploy it to production.

## CLI inspection

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

## Medical Departments follow-up

The separately approved Medical Departments module adds migration `0019_medical_departments`. It was applied locally on 15 November 2026 without seed data. Local verification now finds **20 application tables and zero rows in every table**. Hosted data and schema remain unchanged.

## Hospitals follow-up

The separately approved Hospitals module adds migration `0020_hospitals`, applied locally on 15 November 2026. Verification now finds **21 application tables and zero rows in every table**. No hospital, doctor, affiliation or administrator records were imported or seeded. Hosted data and schema remain unchanged.

## Diseases and Doctors follow-up

The individually approved Diseases and Doctors modules add `0021_medical_diseases` and `0022_doctors`, applied locally on 15 November 2026. Verification finds **25 application tables and zero rows in every table**. The changes add empty schemas only: no doctors, diseases, departments, hospitals, affiliations or administrator accounts were imported or seeded. Hosted data and schema remain unchanged.

## Provider image follow-up

Migration `0023_provider_images` was applied locally on 15 November 2026. It adds image columns to existing tables only. Verification still finds **25 application tables and zero application rows**. No image files or sample records were uploaded into the app database. Hosted schema and data remain unchanged.
