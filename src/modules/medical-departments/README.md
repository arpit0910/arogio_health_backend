# Medical departments

Approved independently on 15 November 2026. This module manages the department taxonomy only; no Doctors, Hospitals, Diseases, Symptoms or relationship modules are created.

- [Module entry](medical-departments.module.ts)
- [Public and protected administration controllers](controllers/medical-departments.controller.ts)
- [Service, version checks and transactional writes](services/medical-departments.service.ts)
- [Request validation](requests/medical-departments.input.ts)
- [CSV/XLSX import](imports/medical-departments.import.ts)
- [Table definition](../../database/schema/medical-departments.schema.ts)
- [Migration](../../../database/migrations/0019_medical_departments.sql)
- [HTTP integration tests](../../../test/medical-departments.e2e-spec.ts)

## APIs

All paths below are under `/api/v1`.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/public/departments` | Paginated active departments, bilingual search and English/Hindi sorting |
| GET | `/public/departments/:id` | Active department by UUID; inactive/missing records return 404 |
| GET | `/admin/departments` | Protected list including inactive records; `status=all/active/inactive` |
| GET | `/admin/departments/:id` | Protected record for editing |
| POST | `/admin/departments` | Create, inactive unless explicitly activated |
| PATCH | `/admin/departments/:id` | Partial edit with required `expectedVersion`; record key is immutable |
| DELETE | `/admin/departments/:id?expected_version=1` | Version-checked deletion; referenced records cannot be removed |
| GET | `/admin/departments/template?format=xlsx` | Empty XLSX template; `format=csv` returns UTF-8 CSV |
| POST | `/admin/departments/import/preview` | Multipart `file`; reports creates/updates/errors without writes |
| POST | `/admin/departments/import/apply` | Multipart `file` and signed `previewToken`; atomic apply |

List parameters: `search`, `language=en/hi`, `page`, `limit` (1–100). Both language fields are returned. Public queries cannot request inactive records. Administration requires an active super-administrator session.

## Data and import identity

The `medical_departments` table holds UUID `id`, unique `record_key`, `name_en`, `name_hi`, `description_en`, `description_hi`, `is_active`, `version`, `created_at` and `updated_at`. English names are unique without case or surrounding whitespace. Hindi fields are optional; they remain stored and searchable independently. No city default is introduced.

Canonical template columns:

```csv
record_key,name_en,name_hi,description_en,description_hi,is_active
```

`record_key` is a permanent external/business identifier, up to 100 ASCII letters, digits, dots, underscores, colons and hyphens; it must start with a letter or digit. Matching keys update existing records. Names alone never silently merge two different identities. A legacy numeric `id` column may replace `record_key`; its key becomes `swasthya:<id>`. Do not provide both keys on a row. Optional bilingual descriptions default to empty; blank/omitted `is_active` means inactive. Use `1/0` or `true/false` for visibility.

Files are limited to 8 MB and 5,000 records. XLSX must have one visible, populated worksheet with plain values. Formula/error/hyperlink cells, merged cells, macros, encrypted archives and oversized expanded workbooks are rejected by the reused workbook validation. Unknown CSV headers and duplicate record keys/names are errors. Fix every row error before applying.

Preview tokens expire after 10 minutes and bind the administrator, uploaded bytes and current department state. A changed file, intervening edit, expired preview or repeated successful apply requires another preview. Writes serialize through a transaction-scoped lock; successful creates/updates/deletions/imports are audited in the existing administration log. No new audit table is introduced.

## Administration portal and rollout

The existing `/admin` portal has a **Departments** tab with bilingual search/editing, visibility filters, pagination, CSV/XLSX templates and import preview/apply. Preview row values render as text. Reproducible synthetic UI previews: `node scripts/previews/preview-medical-departments.cjs`; these never access the application database.

Deploy the rebuilt backend/assets and run migration `0019_medical_departments` on the matching target. No production migration or data import has been performed. Local setup creates an empty table; it does not populate departments or recreate an administrator. Future module approvals can add foreign-key relationships through their own migrations.

## Verification

Build, lint, 114 unit tests, 57 HTTP integration tests (including seven department scenarios), and Drizzle metadata checks passed. Actual portal DOM was reviewed at desktop width and an exact 390px mobile viewport, using synthetic records only. The static UI detector could not resolve the portal?s absolute stylesheet URL; rendered hierarchy and editor fit were checked directly. The local migration was applied, with all 20 application tables still empty.
