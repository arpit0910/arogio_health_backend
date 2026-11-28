# Doctor and hospital images

Doctors and Hospitals each support one primary uploaded image. Use **Image** beside a record in `/admin`, choose a JPG/PNG/WebP file, enter a description, and upload. Maximum upload size is 4 MB. Replacing or removing a photo returns the provider to draft; complete **Source review** to publish again. Existing profile edits and CSV imports preserve the photo. Images cannot be uploaded through CSV/XLSX cells.

## Storage and processing

Migration `0023_provider_images` adds nullable `image_data` (PostgreSQL bytea), `image_revision` and descriptive `image_alt` to the two existing profile tables. It adds `image_url`/`image_alt` to `care_directory_entries` for existing app and search consumers. No new clinical module or application table is introduced. Storage follows the existing database-backed banner approach and works without a writable public-upload directory. Database backups therefore include provider images.

The server checks file size, declared type and actual decoded format. Still JPEG, PNG and WebP are accepted; SVG and animated images are rejected. Sharp applies orientation, limits input to 20 million pixels, resizes within 1200 by 1200, flattens transparency onto white and re-encodes JPEG without source metadata. Original filenames and filesystem paths are not used for storage.

Only super administrators may upload, preview drafts or remove images. Writes require the latest version and commit image metadata, shared care projection, draft state and audit history together. Public image reads enforce the same published/review-freshness rules as public profile reads; doctors additionally require an active linked department. Image responses use `Cache-Control: no-store` so withdrawing a record is checked again on the next image request. List/detail JSON includes image URL, alt text and revision, never image bytes.

## Endpoints

All paths below have `/api/v1` prefix. Replace `providers` with `doctors` or `hospitals`.

| Method | Path | Request / response |
| --- | --- | --- |
| PUT | `/admin/providers/:id/image` | Multipart `file`, `alt`, `expectedVersion`; returns incremented version and draft metadata |
| GET | `/admin/providers/:id/image` | Protected JPEG preview, including drafts |
| DELETE | `/admin/providers/:id/image?expected_version=N` | Remove photo and return to draft |
| GET | `/public/providers/:id/image?v=revision` | JPEG only while the provider is publicly visible |

Profile API responses expose `image_url`, `image_alt` and `image_revision`. Existing `/care`, `/care-search` and `/home/discovery` consumers receive the shared `imageUrl` and `imageAlt` fields. Image revisions update the URL whenever a photo is replaced. Public URLs do not require a bearer token; draft previews do.

## Mobile integration

`D:/arogio-health-app/src/features/care-directory/providerCatalog.ts` validates structured Doctors/Hospitals responses and adapts them to the app's existing care cards and navigation. Home discovery, Find Care, provider lists and details call the new public APIs. Doctor department chips load `/public/departments`; doctor department and hospital type/NABH filters run on the server before pagination. Hospital details load public doctors by hospital affiliation. Doctor details show recorded hours and visible related hospitals, with a retry state for incomplete related reads. Other care kinds and correction submissions retain their existing endpoints.

`ProviderArtwork` resolves uploaded image URLs against the configured API origin, displays the photo and returns to a neutral provider icon on image failure. It no longer assigns bundled hospital photos by matching names. Fees, qualifications, registration, medical council, experience, hospital benefits and recorded hours come from API records. There is no hardcoded city in these new reads. The restored private Profile route points to the existing account screen.

Deploy the image migration and rebuilt backend before releasing the updated app. No hosted deployment, real image upload or sample record import is performed by this implementation. Local databases remain empty. Public image display still needs a configured API reachable by the installed app.

## Verification

- Backend: `test/provider-images.e2e-spec.ts` covers upload/decode, access rules, draft privacy, publication, compatibility URLs, metadata-only JSON, preserve-on-edit, removal, version conflicts, invalid formats and size limits.
- App: `test/providerCatalog.test.ts` covers actual response adapters, image URL safety, server filters/pagination, linked providers and Home section isolation.
- Synthetic previews: backend `scripts/previews/preview-doctors.cjs` and `preview-hospitals.cjs` include an image dialog; app `scripts/preview-provider-catalog.cjs` renders real components against synthetic API fixtures. The browser mock represents native Image with a standard img for static rendering. It is not a device capture or a production-data view.
