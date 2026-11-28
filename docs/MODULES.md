# Backend modules and file ownership

| Folder / Nest module | Responsibility |
| --- | --- |
| [authentication](../src/modules/authentication/README.md) | Email/password and Google sign-in, access tokens, refresh sessions and password hashing. |
| [user-accounts](../src/modules/user-accounts/README.md) | Profiles, profile setup, referrals, account recovery and deletion. |
| [personal-wellness](../src/modules/personal-wellness/README.md) | Water intake, menstrual tracking, medicine schedules and doses, activity targets and data export. |
| [care-directory](../src/modules/care-directory/README.md) | Hospitals, doctors, labs, pharmacies, medicine information, affiliations and correction requests. |
| [health-resources](../src/modules/health-resources/README.md) | Health articles, article categories, blood-bank discovery and their shared CSV/workbook import workflow. |
| [doctors](../src/modules/doctors/README.md) | Structured bilingual doctors, department/hospital relations, recorded schedules, source review and file imports. |
| [diseases](../src/modules/diseases/README.md) | Bilingual disease catalog, department links, administration and preview/apply imports. |
| [hospitals](../src/modules/hospitals/README.md) | Structured bilingual hospitals, multi-city discovery, source review and transactional file imports. |
| [medical-departments](../src/modules/medical-departments/README.md) | Bilingual department taxonomy, protected administration, public discovery and preview/apply file imports. |
| [meditation-library](../src/modules/meditation-library/README.md) | Published meditation videos and guided practices. |
| [home-dashboard](../src/modules/home-dashboard/README.md) | Home content, care discovery and weather integration. |
| [jeeva-assistant](../src/modules/jeeva-assistant/README.md) | AI conversations, application guidance, safety rules and optional saved-health context. |
| [administration](../src/modules/administration/README.md) | Protected administrator APIs, content management, portal assets and audit logs. |
| [system-health](../src/modules/system-health/README.md) | Operational API liveness and database readiness checks. |
| [system-status](../src/modules/system-status/README.md) | Public backend status page and bounded request-activity diagnostics. |

## Follow a request

1. `src/app.module.ts` registers modules.
2. `controllers/` maps existing API routes to feature behavior.
3. `requests/` validates incoming data; `responses/` holds response DTOs where needed.
4. `services/` implements behavior; `repositories/` isolates existing database-access boundaries.
5. `domain/`, `imports/`, `integrations/` and `content/` hold specialist helpers.
6. `src/database/schema/` has one descriptively named file per application table; `index.ts` exports the complete Drizzle schema.

## Shared code and operations

| Folder | Purpose |
| --- | --- |
| `src/configuration/` | Environment schema and configuration validation |
| `src/bootstrap/` | HTTP setup, static assets and hosting rules |
| `src/common/authentication/` | Shared authentication guards, user types and decorators |
| `src/common/health-measurements/` | Measurement parsing and units |
| `src/infrastructure/` | External provider adapters |
| `src/database/` | Connection, migration runner, schema definitions and explicit seeds |
| `database/migrations/` | SQL history and Drizzle snapshots |
| `scripts/database/` | Migration inventory, diagnostics and explicit data reset |
| `scripts/local/` | Persistent or disposable local API runner |
| `scripts/verification/` | HTTP/client checks |
| `scripts/previews/` | Admin preview tooling |
| `test/` | Cross-module HTTP/database tests |
| `dist/` | Generated deployment output; rebuild from source |

See [naming and old-to-new mappings](NAMING.md), the [database table catalog](../database/TABLES.md), and [data-reset workflow](../database/RESET.md). Public API paths and Expo route filenames remain stable. The shared health-resources backend module retains its existing import/service boundary; its article and blood-bank responsibilities are listed explicitly. Source folder renames do not imply API URL changes.

Deploy the rebuilt backend and `0018_descriptive_domain_names` migration together. Existing hosted code needs its current table names until that rollout. Historical SQL files are immutable.
