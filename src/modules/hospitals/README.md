# Hospitals

Approved independently on 15 November 2026. This module adds structured hospital records, protected administration, public discovery, listing review and CSV/XLSX import. It does not add a Doctors module or import existing records.

## Source map

- [Module](hospitals.module.ts)
- [Public/admin endpoints](controllers/hospitals.controller.ts)
- [Service and transactional projection](services/hospitals.service.ts)
- [Validation and phone handling](requests/hospitals.input.ts)
- [CSV/XLSX and SwasthyaSearch mapping](imports/hospitals.import.ts)
- [Hospital schema](../../database/schema/hospitals.schema.ts)
- [Migration](../../../database/migrations/0020_hospitals.sql)
- [Integration tests](../../../test/hospitals.e2e-spec.ts)

## One hospital identity

`hospitals.id` references the same UUID in `care_directory_entries`. The structured hospital record is authoritative; the care row is its transactional search/compatibility projection. New records are written to both tables in one transaction. They are not two independent catalogs.

Existing `/care?kind=hospital`, `/care/:id`, corrections, affiliation IDs and Home discovery keep that identity. Hospital discovery accepts supplied cities and has no implicit city restriction when a hospital list is requested without a city. Existing doctor coverage behavior is unchanged. Old care entries without a structured profile continue to work; they are not automatically copied or adopted. A colliding record key requires explicit identity resolution rather than a duplicate hospital.

Use the new **Hospitals** portal tab to edit a structured hospital. Legacy care editing cannot overwrite its projection. Legacy review still validates hospital source requirements and advances the hospital version. Existing affiliation/correction references can prevent deletion; withdraw publication instead. No doctor records or new affiliation tables are created by hospital imports.

## API routes

Paths below are under `/api/v1`. Admin routes require an active super-administrator session.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/public/hospitals` | Current reviewed/published hospitals; search, city, state, type and benefit filters |
| GET | `/public/hospitals/:id` | Reviewed hospital detail |
| GET | `/admin/hospitals` | All structured hospitals, including drafts |
| GET | `/admin/hospitals/:id` | Full record for administration |
| POST | `/admin/hospitals` | Create a draft hospital and care projection |
| PATCH | `/admin/hospitals/:id` | Partial edit with `expectedVersion`; returns the hospital to draft |
| POST | `/admin/hospitals/:id/review` | Version-checked listing review/publication or withdrawal |
| DELETE | `/admin/hospitals/:id?expected_version=1` | Version-checked deletion of the hospital and its care projection |
| GET | `/admin/hospitals/template?format=xlsx` | XLSX template; `format=csv` returns CSV |
| POST | `/admin/hospitals/import/preview` | File validation and create/update/error preview, without writes |
| POST | `/admin/hospitals/import/apply` | Atomic multipart `file` + signed `previewToken` |

List queries: `search`, `city`, `state`, `type`, `benefit`, `language=en/hi`, `page`, `limit` (1–100). Benefits: `ayushman`, `janaadhaar`, `cghs`, `esic`, `rgahs`, `cashless`, `nabh`. Admin lists also accept `status=all/published/draft`. Public results omit reviewer identity and review evidence.

## Fields and publication

Required identity/location: `record_key`, `name_en`, `city`, `state`. Optional bilingual name/address/summary, structured address lines/landmark/pincode, two country-code/phone pairs, email, HTTPS website/listing link, paired coordinates, type, specialties and cashless scheme labels are supported.

Scheme/facility flags are nullable: `accepts_ayushman`, `accepts_janaadhaar`, `accepts_cghs`, `accepts_esic`, `rgahs_approved`, `is_cashless`, `nabh_accredited`, `is_24_7`. Null means unknown; it is not converted to false or true. These are sourced catalog fields, not a live scheme verification integration.

An international phone starts with `+`; otherwise its country code is required. Public publication requires an address, primary contact, HTTPS listing link, reviewer identity/role, evidence, explicit source confirmation and the current version. Review is current for 180 days, matching the existing care policy. No live beds, appointment slots or guaranteed availability are inferred. Every metadata edit or import update withdraws publication and clears review, even when the record key is unchanged.

## File imports

Download the current template for the complete canonical columns. English/Hindi strings are preserved. Array columns `specialties` and `cashless_schemes` use semicolons. Boolean columns accept `1/0`, `true/false` or blank (unknown). Empty coordinates, phones, website, email and listing link stay missing. A draft can omit contact/source data but cannot be published until reviewed.

The SwasthyaSearch hospital export is supported: legacy numeric `id` becomes `swasthya:hospital:<id>`; `type` maps to `hospital_type`; original address and phone columns are retained; `cashless_schemes_list` maps to the canonical list. Supported historical phone/eligibility aliases are normalized. Conflicting alias values, duplicate file identities, unknown columns and invalid rows are reported. `is_verified` is explicitly ignored for publication and counted in the preview. Supply `record_key` or legacy `id`, never both.

Imports are limited to 8 MB/5,000 rows. XLSX uses the existing bounded, single-visible-sheet parser and rejects formulas, macros, encrypted archives and merged cells. Any row error prevents apply. Source keys update the same UUID; names alone never merge facilities. A signed preview expires after 10 minutes and binds uploaded bytes, actor and current hospital state. Replays, stale records, changed files and expired previews require another preview. Audit writes and both hospital/projection changes share the transaction.

## Rollout and previews

Deploy rebuilt code/admin assets with migration `0020_hospitals`. The local migration creates only the schema. No legacy data, hospital samples or administrators are seeded. Hosted changes remain pending.

`node scripts/previews/preview-hospitals.cjs` renders actual admin markup with synthetic browser-only fixtures. It never opens the application database. Advanced hospital fields are available through the new APIs; existing mobile hospital cards continue using their compatible care contract.

## Verification

Build, lint, 114 unit tests, all 65 API integration tests (including eight hospital scenarios) and Drizzle checks passed. The admin list, editor, source-review dialog and editor footer were reviewed at desktop and exact 390px mobile viewports with synthetic data. The static UI detector could not resolve the absolute stylesheet URL; actual rendered controls were checked directly. Local migration verification confirms 21 empty application tables. Hosted deployment and real-data imports remain pending.

## Uploaded images

Primary photo upload, draft previews, removal, source-review behavior and image API routes are documented in [Provider images](../../../docs/PROVIDER_IMAGES.md). Profile JSON returns image metadata only; image bytes are served separately. Profile edits and file imports preserve uploaded photos.
