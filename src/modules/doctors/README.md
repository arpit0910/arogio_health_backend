# Doctors

Structured doctor profiles own `doctors`, `doctor_departments` and `doctor_hospital_affiliations`. Controllers, requests, imports and services live in their named folders. Migration: `database/migrations/0022_doctors.sql`.

## Administration

Open **Doctors** in `/admin` with a super administrator account. Add/edit English and Hindi profiles, medical registration and council, qualifications, experience, INR consultation fees, languages, contacts, addresses, coordinates and evidence URL. Select existing medical departments and add existing hospitals with role, consultation mode, practice days, start/end time and hospital fee. Sunday is 0; Saturday is 6. One schedule per doctor/hospital pair is supported. Times must be in ascending order within one day; overnight or multiple daily sessions need separate future scope. Schedules are recorded information, not bookable appointment slots.

Every create, edit or import is a draft. Source review requires an HTTPS source URL, address, primary phone, registration number, council, qualifications and at least one active department. The reviewer records identity, qualification and evidence, and explicitly confirms publication. Public visibility expires after 180 days. A deactivated department hides doctors without another active linked department. Public responses exclude reviewer identity/evidence and unpublished or expired hospital links.

Edits, review and deletion require the current `expectedVersion` (`expected_version` for DELETE). Stale versions return 409. Mutations and their audit records commit together. A delete removes the doctor and its links; corrections referencing the care identity prevent deletion. Withdrawing publication preserves history.

## APIs

All routes have `/api/v1` prefix.

| Method | Route | Use |
| --- | --- | --- |
| GET | `/public/doctors` | Reviewed directory; search, city, state, department_id, hospital_id, language=en/hi, page, limit |
| GET | `/public/doctors/:id` | Reviewed profile and visible relations |
| GET/POST | `/admin/doctors` | Protected list/create; list also supports status=all/draft/published |
| GET/PATCH/DELETE | `/admin/doctors/:id` | Protected detail/edit/delete |
| POST | `/admin/doctors/:id/review` | Explicit publication/withdrawal |
| GET | `/admin/doctors/template?format=csv` or `xlsx` | Header-only template |
| POST | `/admin/doctors/import/preview` | Multipart file validation and signed preview |
| POST | `/admin/doctors/import/apply` | Same file and previewToken; atomic apply |

Department links use `department_ids` (UUID array). `affiliations` contains objects with `hospital_id`, `role`, `consultation_mode` (in_person/online/hybrid), `availability`, `days_of_week` (integer array), `start_time`/`end_time` (HH:mm or both null), and nullable INR `consultation_fee`. Omitted arrays on PATCH are preserved; an explicit empty array clears them.

## Imports

Download a CSV/XLSX template from the portal. Maximum 8 MB and 5,000 rows; one populated workbook sheet. Formulas, unsafe workbook features, duplicate/conflicting headers and unknown columns are rejected. Any row error prevents the entire apply. Preview signatures bind the administrator, exact file bytes, doctor/relation/master state and a 10-minute expiry. A successful apply consumes the preview through changed state. Source keys are immutable; legacy IDs are never interpreted as local UUIDs.

Canonical files contain one row per doctor. Qualifications, languages and `department_source_keys`/`hospital_source_keys` use semicolons. Referenced masters must already exist. Optional schedule fields apply to all hospital references in the row; the editor supports individual schedules afterward. Import replaces the complete doctor profile and its links; omitted optional values clear to defaults. Review the preview before applying, especially updates to published records.

The inspected SwasthyaSearch joined export is supported with `doctor_id` becoming `swasthya:doctor:<id>`, first_name/last_name, education_degrees, about_en/hi, languages_spoken, department_name_en or department_id, hospital_id/name/city, doctor_hospital_role, days_of_week, start_time/end_time and hospital fees. Repeated `doctor_id` rows merge distinct hospital affiliations only when profile fields agree. Conflicting profiles and duplicate doctor/hospital pairs are errors. Department names require an exact match; hospital names must identify one existing name/city. Numeric department/hospital IDs resolve their imported source keys. Missing masters never create records. Legacy local phone numbers need country-code columns or full international numbers. Add source URLs and complete source review separately before publication.

Legacy `is_verified` is validated and reported but never publishes a doctor. Gender, old pivot IDs and department Hindi display labels are explicitly counted as excluded metadata, rather than being used to change master records. Other unsupported fields require conversion to the template. No records are imported automatically.

## Compatibility

Each structured doctor shares its UUID with one `care_directory_entries` row. The service updates that projection and `care_provider_affiliations` atomically. Existing `/care`, `/care-search`, home discovery, corrections and hospital affiliation display continue to use those IDs. Published doctors can be discovered across recorded cities. Legacy structured-doctor edits, review and affiliation replacement return 409 with direction to Doctors administration. Unstructured legacy care records remain supported.

Tests: `test/doctors.e2e-spec.ts`. Synthetic browser preview generator: `scripts/previews/preview-doctors.cjs`; it never accesses the application database.

## Uploaded images

Primary photo upload, draft previews, removal, source-review behavior and image API routes are documented in [Provider images](../../../docs/PROVIDER_IMAGES.md). Profile JSON returns image metadata only; image bytes are served separately. Profile edits and file imports preserve uploaded photos.
