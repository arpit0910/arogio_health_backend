# Application database tables

Each table has its own source file in `src/database/schema/`. Physical names use descriptive plural `snake_case`; source filenames use matching `kebab-case`.

| Table | Owning feature | Schema definition | Previous physical name |
| --- | --- | --- | --- |
| `administration_audit_logs` | `administration` | [administration-audit-logs.schema.ts](../src/database/schema/administration-audit-logs.schema.ts) | `admin_audit` |
| `authentication_identities` | `authentication` | [authentication-identities.schema.ts](../src/database/schema/authentication-identities.schema.ts) | `auth_identities` |
| `authentication_sessions` | `authentication` | [authentication-sessions.schema.ts](../src/database/schema/authentication-sessions.schema.ts) | `auth_sessions` |
| `blood_bank_corrections` | `care-directory` | [blood-bank-corrections.schema.ts](../src/database/schema/blood-bank-corrections.schema.ts) | `bank_corrections` |
| `blood_bank_directory_entries` | `health-resources` | [blood-bank-directory-entries.schema.ts](../src/database/schema/blood-bank-directory-entries.schema.ts) | `blood_banks` |
| `care_directory_corrections` | `care-directory` | [care-directory-corrections.schema.ts](../src/database/schema/care-directory-corrections.schema.ts) | `care_corrections` |
| `care_directory_entries` | `care-directory` | [care-directory-entries.schema.ts](../src/database/schema/care-directory-entries.schema.ts) | `care_entries` |
| `care_provider_affiliations` | `care-directory` | [care-provider-affiliations.schema.ts](../src/database/schema/care-provider-affiliations.schema.ts) | `care_affiliations` |
| `health_article_categories` | `health-resources` | [health-article-categories.schema.ts](../src/database/schema/health-article-categories.schema.ts) | `article_categories` |
| `health_articles` | `health-resources` | [health-articles.schema.ts](../src/database/schema/health-articles.schema.ts) | `articles` |
| `home_banners` | `home-dashboard` | [home-banners.schema.ts](../src/database/schema/home-banners.schema.ts) | `home_banners` |
| `medicine_dose_logs` | `personal-wellness` | [medicine-dose-logs.schema.ts](../src/database/schema/medicine-dose-logs.schema.ts) | `medicine_doses` |
| `meditation_library_items` | `meditation-library` | [meditation-library-items.schema.ts](../src/database/schema/meditation-library-items.schema.ts) | `meditation_content` |
| `menstrual_daily_logs` | `personal-wellness` | [menstrual-daily-logs.schema.ts](../src/database/schema/menstrual-daily-logs.schema.ts) | `cycle_entries` |
| `menstrual_periods` | `personal-wellness` | [menstrual-periods.schema.ts](../src/database/schema/menstrual-periods.schema.ts) | `cycle_periods` |
| `personal_wellness_settings` | `personal-wellness` | [personal-wellness-settings.schema.ts](../src/database/schema/personal-wellness-settings.schema.ts) | `wellness_settings` |
| `user_accounts` | `authentication` | [user-accounts.schema.ts](../src/database/schema/user-accounts.schema.ts) | `users` |
| `water_intake_logs` | `personal-wellness` | [water-intake-logs.schema.ts](../src/database/schema/water-intake-logs.schema.ts) | `water_logs` |
| `water_reminder_states` | `personal-wellness` | [water-reminder-states.schema.ts](../src/database/schema/water-reminder-states.schema.ts) | `water_task_states` |

Migration `0018_descriptive_domain_names.sql` changes names only, including dependent constraints/indexes. It does not change columns or delete records. `home_banners` already had a clear physical name. The earlier migrations retain their original filenames, hashes and identities. `drizzle.__drizzle_migrations` remains the migration journal, not an application data table.

The [machine-readable catalog](table-catalog.json) is used by the explicit data-reset utility.
