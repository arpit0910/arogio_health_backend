# Diseases

Owns the `medical_diseases` table and migration `database/migrations/0021_medical_diseases.sql`. Find route handlers under `controllers`, validation under `requests`, import parsing under `imports`, and transactional database behavior under `services`.

The **Diseases** administration tab provides bilingual names/descriptions, an existing Medical Department link, active state, stable source identity and optimistic versioning. Public records require both an active disease and active department. This is a catalog; symptoms, embeddings, assessment and diagnosis are outside this approved module.

## Routes

Prefix all routes with `/api/v1`. Public GET `/public/diseases` supports search, language=en/hi, department_id, page and limit; GET `/public/diseases/:id` returns one available record. Protected super administrator routes: GET/POST `/admin/diseases`; GET/PATCH/DELETE `/admin/diseases/:id`; GET `/admin/diseases/template?format=csv` or `xlsx`; POST `/admin/diseases/import/preview` and `/apply` accept multipart `file`, with `previewToken` additionally required on apply. Admin list adds status=all/active/inactive. PATCH requires `expectedVersion`; DELETE query requires `expected_version`.

## Import workflow

Templates contain source_key, name_en, name_hi, description_en, description_hi, department_source_key and is_active. Legacy numeric id maps to `swasthya:disease:<id>`. Existing department references may use source key, UUID, a numeric legacy department_id (`swasthya:<id>`) or exact English name; supplied references must agree. No department or symptom records are created. Blank active flags default to inactive; 1/0 and true/false are accepted. Unknown columns, including symptom embeddings, are rejected. Duplicate identities/names and missing or ambiguous department references produce row errors.

Use CSV or one populated XLSX sheet, at most 8 MB and 5,000 records. Workbook formulas and unsafe features are rejected. Preview reports creates, updates and every row error. Any error blocks apply. Signed authorization binds the administrator, exact file, current diseases/departments and a 10-minute expiry. Apply atomically upserts by source key, increments versions and records audit history. Imports replace all template-controlled values, so review blank optional fields on updates. No real records are loaded by installing this module.

Tests: `test/diseases.e2e-spec.ts`. Synthetic admin previews: `scripts/previews/preview-diseases.cjs`.
