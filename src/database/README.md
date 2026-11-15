# Database runtime

- [schema/](schema/README.md): one file per named application table.
- [database.service.ts](database.service.ts): shared PostgreSQL/Drizzle connection.
- [migrate.ts](migrate.ts): migration runner.
- [seeds/](seeds/seed-super-admin.ts): explicit administrator creation.
- [SQL migrations](../../database/migrations/README.md): immutable SQL history.
- [Table catalog](../../database/TABLES.md) and [reset workflow](../../database/RESET.md).
