# SwasthyaSearch to Arogio: module comparison and approval queue

Reviewed 15 November 2026. Reference project: `D:/xampp/htdocs/SwasthyaSearch`. Target: `D:/arogio_health_backend`.

This is a source-code comparison of routes, models, migrations, import services, controllers and schema definitions. The legacy application was not executed and its database was not queried. A model file alone is not evidence that a feature works. The original review was read-only. The individually approved implementations are reflected below; no real data has been imported.

## What already exists in Arogio

| Requested capability | Existing implementation | Gap compared with SwasthyaSearch |
| --- | --- | --- |
| Doctors | Approved `doctors` module with the same care UUID, structured bilingual profiles, registration/council, qualifications, experience, fees, contacts and department links | Implemented with admin management, source review, public APIs and CSV/XLSX preview/apply. |
| Hospitals | Approved `hospitals` module with the same care UUID, structured addresses/contacts, type and benefits | Implemented with source review, admin/public APIs and CSV/XLSX preview/apply. |
| Doctor–hospital affiliations | `care_provider_affiliations` | Currently only doctor/hospital ID pairs. Legacy links also contain role, consultation mode, availability, days, times, fees and external link IDs. |
| Articles | `health-resources`, `health_articles`; bilingual content, list/detail, filtering, sorting, pagination, managed thumbnails, admin editing and preview/apply import | Reuse this implementation. Do not create a duplicate Articles module without a separately approved architectural change. Export parity and comments are separate decisions. |
| Article categories | `health_article_categories`; managed bilingual names, descriptions and images | Already more structured than the legacy article's category string. No duplicate category store needed. |
| Blood banks | `health-resources`, `blood_bank_directory_entries`; list/detail/nearby behavior, review/corrections and preview/apply import | Already present. Legacy source provenance/stock timestamps and any export parity would be explicit enhancements. Do not infer live stock from listed blood groups. |
| Medicine information | `care-directory`, `kind=medicine`, summary/precautions/review; personal medicine reminders are separate | Legacy `Medicine` has a much richer education catalog, bilingual safety sections, interactions, warnings, references and reports. No corresponding full catalog/importer exists in Arogio. |
| AI assistant | `jeeva-assistant` | General AI guidance exists. Legacy FAQ/Q&A catalogs, cached questions, failed-query administration and persistent chat history are not equivalent to that service. |
| Activities | `personal-wellness` and `meditation-library` | Tracking, guided practices and meditation content exist. The legacy activity catalog, mood/grounding flows and games are a separate scope. |
| Corrections/moderation | Provider and blood-bank correction tables and administration routes | This does not implement the legacy general user-submission approval/import workflow or article-comment moderation. |

The original shared resource importer still manages Articles and Blood Banks. Approved Departments, Hospitals, Diseases and Doctors have dedicated importers and templates. Structured doctor/hospital administration and public discovery accept recorded cities without a city default. Generic legacy care creation retains its previous city restriction; structured profiles must use their own administration tabs.

## Missing or separate modules requiring individual approval

| Proposed capability | Legacy evidence | Arogio status / approval scope |
| --- | --- | --- |
| Medical departments | `Department`, `department_doctor`, department CRUD/import and public department display | Approved and implemented in `medical-departments`: bilingual records, active state, admin/public APIs and CSV/XLSX preview/apply. |
| Diseases | `Disease`, disease CRUD/import/export and public disease listing | Approved and implemented in `diseases`: bilingual records, department links, admin/public APIs and CSV/XLSX preview/apply. Symptoms remain excluded. |
| Symptoms | `Symptom`, `disease_symptom`, disease symptom synchronization | Missing. Separate approval for symptom taxonomy and disease associations; not implied by approval of Diseases. |
| Full medicine catalog | `Medicine`, `MedicineReport`, import/export and public medicine pages | Partial generic information only. Approve structured educational fields, review workflow, reports and import scope before expanding. |
| Home remedies | `HomeRemedy`, categories, ingredients, pivots, Filament resources and import/export service | Missing. Scope includes bilingual remedies, ingredients, categories, evidence/review fields and explicit publication state. |
| Quizzes | `Quiz`, questions/results JSON, admin CRUD and public quiz/result routes | Missing. Content administration and results are a separate module. Legacy route inspection did not show a general quiz file importer. |
| FAQs | `Faq`, admin CRUD, search usage | Missing as an editable data catalog. Approve separately from medical Q&A and AI. |
| Medical Q&A | `GeneralQuestion`, cached medical questions and their admin routes | Missing as a managed knowledge catalog. Cache/history/failed-query analytics require explicit scope decisions. |
| Symptom assessment | `SymptomTestController`, submissions and admin reports | Missing as a structured workflow. General Jeeva chat is not that implementation. Approve separately after taxonomy/content requirements are agreed. |
| Consultations | `Consultation`, request/status routes, signalling, chat and admin accept/reject | Missing. Appointment/session workflow and any calling integration need their own approval. |
| General user submissions | `UserSubmission`, submit, moderation, export and import-to-directory actions | Missing. Existing provider corrections do not cover this. |
| Article comments | `ArticleComment`, article relationship and comment controller/routes | Missing. Separate approval for submission, moderation and visibility. |
| Directory synchronization | Sync/enrichment services, progress endpoints, deduplication and `DirectorySyncHistory` | Missing. Provider access, credentials, scheduling, provenance and sync history are separate from file import. No scraper was run in this review. |
| Unified health search | `SearchController` searches articles, departments, diseases, doctors, FAQs, hospitals and medicines | Partial care search exists. Approve cross-catalog search after its underlying modules are approved. |
| Additional health activities | `Activity` model, activity routes, grounding/mood/games pages | Partial overlap only; no automatic port of the legacy activity catalog or games. |

### Legacy files that need further verification

`Clinic`, `Specialty` and `DiseaseTaxonomy` model files are present. Clinics/specialties are referenced by some scrapers/resources, while `DiseaseTaxonomy` is referenced by `Specialty`. The supplied migration directory does not include matching create-table migrations for these three model tables. Do not treat them as proven, standalone working modules or automatically introduce another taxonomy alongside medical departments. Approve their scope only after checking the intended schema and relationships.

Authentication, user accounts, administrator protection, banners and basic operational monitoring already exist in Arogio. They do not need duplicate legacy modules.

## How the legacy import and display flows work

1. Protected admin routes accept a file and call a module-specific importer. Most inspected dashboard imports validate CSV/TXT. `SpreadsheetService` also contains XLSX-reading code, but that does not mean each upload endpoint accepts XLSX. Home-remedy upload explicitly accepts CSV/TXT/XLSX and create-only/create-update/update-only modes.
2. `DoctorImportService` normalizes column names and missing values, supports `doctor_full_name`, and resolves existing doctors by an export ID or registration number. It resolves a department by ID/name and connects the doctor to it. It resolves/creates the related hospital and attaches or updates the doctor–hospital pivot, including fee and availability fields.
3. Hospital import matches an existing ID or name/city, normalizes two phone/country-code pairs, and stores address, coordinates, type and benefits. Disease import resolves or creates a department, creates the disease and synchronizes symptom records. Department import uses `firstOrCreate`; it is not a full update importer.
4. Public doctor/hospital controllers load relationships and apply city, department, benefit, experience, search and distance-related filters. Department pages show doctor/disease counts; disease pages use department/symptom relations. Articles have separate published-content browsing/reading.
5. Reliable-directory/scraper routes form another ingestion path. Their policies differ from some direct CSV imports. The reference is not one uniform import implementation.

### Requirements to retain or improve when approved

- Preserve English/Hindi fields, stable external source IDs and real relationships. A legacy numeric export ID must not be treated as an Arogio UUID.
- Use explicit matching keys; do not associate ambiguous department names by an unchecked partial match.
- Reuse Arogio's existing file validation, row-error reporting, preview/apply separation and transaction-based writes where appropriate.
- Keep import templates aligned with export columns. Show creates/updates/skips/errors before applying. Define duplicate/conflict behavior for each approved module.
- Support actual supplied locations; do not recreate hardcoded city defaults in new modules.
- Keep verification, publication, scheme eligibility, availability and stock explicit. Some legacy import paths default `is_verified` to true; that default must not be copied as proof of verification.
- Keep current mobile/API routes working through adapters while introducing any approved normalized tables. Do not create two competing catalogs for the same entity.
- Importing legacy records is a separate action from building an importer. The fresh database stays empty until the user authorizes a data import.

## First proposed approval: Medical departments only

Create `src/modules/medical-departments/` with its controller, service, request validation, admin/public API endpoints and `medical_departments` schema/migration. Include bilingual names/descriptions, a stable import identity, active state, CSV/XLSX template and preview/apply validation. Do not add Doctors, Hospitals, Diseases, Symptoms or their relationship tables under this approval.

Departments are a useful first step because both doctor and disease imports need a stable department taxonomy. Suggested subsequent decision order is Hospitals, Doctors/affiliations, Diseases, Symptoms, then individually approved enhancements to existing Articles/Blood Banks and the remaining optional modules.

Every module above requires its own explicit user decision before implementation. Approval of one module does not approve another. Current state: **Medical Departments, Hospitals, Diseases and Doctors approved individually and implemented; Symptoms and every other addition remain pending approval**. See [the department module](../src/modules/medical-departments/README.md).

## Source pointers

Legacy sources:

- `D:/xampp/htdocs/SwasthyaSearch/routes/web.php`
- `D:/xampp/htdocs/SwasthyaSearch/app/Services/DoctorImportService.php`
- `D:/xampp/htdocs/SwasthyaSearch/app/Services/SpreadsheetService.php`
- `D:/xampp/htdocs/SwasthyaSearch/app/Http/Controllers/Admin/AdminDashboardController.php`
- `D:/xampp/htdocs/SwasthyaSearch/app/Http/Controllers/DoctorController.php`
- `D:/xampp/htdocs/SwasthyaSearch/app/Http/Controllers/HospitalController.php`
- `D:/xampp/htdocs/SwasthyaSearch/app/Http/Controllers/PageController.php`
- `D:/xampp/htdocs/SwasthyaSearch/app/Models/` and `database/migrations/`

Arogio sources:

- [Care input validation](../src/modules/care-directory/requests/care-directory.input.ts)
- [Care endpoints](../src/modules/care-directory/controllers/care-directory.controller.ts)
- [Care entries](../src/database/schema/care-directory-entries.schema.ts)
- [Current affiliations](../src/database/schema/care-provider-affiliations.schema.ts)
- [Resource import formats](../src/modules/health-resources/imports/import.ts)
- [Resource service and transactional import](../src/modules/health-resources/services/health-resources.service.ts)
- [Resource administration endpoints](../src/modules/administration/controllers/health-resources-administration.controller.ts)
- [Current table catalog](../database/TABLES.md)

## Approved Doctors and Diseases implementation

See [Doctors](../src/modules/doctors/README.md) and [Diseases](../src/modules/diseases/README.md) for supported fields, import compatibility and limits. Doctors was initially skipped and subsequently explicitly approved. No real data was imported. Legacy automatic master creation, verification defaults and disease-to-symptom synchronization were deliberately excluded from these approvals.
