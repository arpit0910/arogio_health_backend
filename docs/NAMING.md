# Project naming conventions

Folders describe responsibilities in `kebab-case`. Nest classes use the matching `PascalCase` name and role, such as `AuthenticationModule`, `CareDirectoryService` and `SystemHealthController`. DTOs remain recognizable Nest DTOs inside `requests/` or `responses/`. Tables use descriptive plural `snake_case`; exported table bindings use matching `camelCase`.

## Backend module names

| Earlier folder | Current folder |
| --- | --- |
| `auth` | [`authentication`](../src/modules/authentication/README.md) |
| `users` | [`user-accounts`](../src/modules/user-accounts/README.md) |
| `wellness` | [`personal-wellness`](../src/modules/personal-wellness/README.md) |
| `care` | [`care-directory`](../src/modules/care-directory/README.md) |
| `directory` | [`health-resources`](../src/modules/health-resources/README.md) |
| `meditation` | [`meditation-library`](../src/modules/meditation-library/README.md) |
| `home` | [`home-dashboard`](../src/modules/home-dashboard/README.md) |
| `chat` | [`jeeva-assistant`](../src/modules/jeeva-assistant/README.md) |
| `admin` | [`administration`](../src/modules/administration/README.md) |
| `health` | [`system-health`](../src/modules/system-health/README.md) |
| `status` | [`system-status`](../src/modules/system-status/README.md) |

## Frontend feature names

| Earlier folder | Current folder |
| --- | --- |
| `auth` | `authentication` |
| `care` | `care-directory` |
| `chat` | `jeeva-assistant` |
| `health-sync` | `health-connections` |
| `home` | `home-dashboard` |
| `launch` | `app-launch` |
| `onboarding` | `account-onboarding` |
| `wellness` | `personal-wellness` |
| `directory` | `articles`, `blood-banks`, `emergency`; shared API at `services/api/healthResourcesApi.ts` |
| `lib/queryClient.ts` | `services/api/queryClient.ts` |
| `lib/time.ts` | `shared/date-time.ts` |

Both projects use `configuration/` for configuration source. The frontend hospital, doctor and medicine-library wrappers have named screen files and exports. Article artwork now has content-based filenames.

## Stable interfaces

Public API URLs, Expo `src/app/` route filenames, native package identifiers and migration history retain their external identities. Shared folders such as `controllers`, `services`, `repositories`, `components`, `navigation`, `assets`, `scripts` and `test` already have conventional, readable meanings. Dependencies and generated Android internals are not renamed.

[All database names and source locations](../database/TABLES.md).
