# Arogio super-admin portal

The portal is a backend-served browser application at `/admin`, with static assets at `/admin-assets/` and protected API routes under `/api/v1/admin`. It is not part of the mobile application. The login shell can be loaded publicly; administrative data/actions require both a valid active session and a database-backed `super_admin` role.

## Configure and seed

Apply the normal migration chain, including `0009_minor_green_goblin.sql` (recoverable account deletion) and `0010_pretty_nekra.sql` (role, banners and audit tables). Use a dedicated administrator email, not an existing user account.

Configure these values in the deployment's private environment or `.env.production` before running the production seeder:

- `SUPER_ADMIN_EMAIL`: the dedicated email.
- `SUPER_ADMIN_PASSWORD`: a unique 16-128 character password.
- `SUPER_ADMIN_NAME`: optional, 2-100 characters; defaults to Arogio Super Admin.

The existing database, JWT, Google-client and other required backend environment settings are still needed. No seeded credential is hardcoded or returned by the API. Do not commit private environment values.

From the backend project on Windows:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run db:migrate:production
npm.cmd run seed:super-admin:production
```

Use the equivalent `npm` commands on the hosting platform. Local development uses `npm.cmd run seed:super-admin`, which reads `.env.local`. The production command reads `.env.production` and runs the compiled seeder. See `SHARED_HOSTING.md` for the existing hosting workflow.

The seeder creates an active `super_admin` with Argon2id password hashing. Rerunning it for an existing super-admin email returns that account without resetting its password or changing status. It refuses to promote an email belonging to an ordinary user. The administrator is managed by the seeder; portal account actions cannot disable/delete administrator accounts, and the normal self-delete endpoint also protects them. Seeder credentials are not needed for normal server startup and can be removed from deployment configuration after a successful seed.

After deployment, visit the backend origin followed by `/admin` and sign in with the seeded account. A normal user's sign-in does not grant portal access. Session tokens stay in browser memory, refresh through the existing rotating-token flow and are cleared/revoked on sign-out. Refresh races with sign-out and concurrent old-token responses have dedicated regression coverage. Reloading the page requires signing in again.

## Portal functions

- **Overview:** total/active/completed/referred/soft-deleted account counts, 7/30-day registrations, daily registration series, saved care counts, recent accounts and referral leaders. These are database aggregates, not medical or device analytics.
- **People:** paginated name/email search, create normal accounts, view profiles and saved tracking, edit supported profile fields, disable/restore/soft-delete normal accounts. Existing sessions are revoked on status actions. Disabling an already soft-deleted account preserves its deletion dates; repeated soft deletion preserves the recovery deadline.
- **Tracking:** structured forms for activity totals/targets, water plans/logs, medicines/doses, cycle settings/check-ins and period dates. Existing activity entries can be edited; blank target values remove targets. Individual records and category tracking data have explicit destructive actions. Account soft deletion retains records; category deletion permanently removes that category.
- **Home banners:** upload, preview drafts, edit title/alternative text/destination/order, publish/unpublish and delete. Only allowlisted internal app routes are accepted. Uploaded images begin as drafts.
- **Audit trail:** administrative profile/record reads and change attempts are recorded with actor, action, target, outcome and timestamp. Passwords and health payload contents are not copied into the audit log.

Private record summaries use the existing wellness snapshot limits. Water, cycle-entry and period history have paginated record routes for browsing beyond the summary. Connected-app readings and foreground sensor history remain on the device and are not uploaded, so the portal does not pretend to display them. Password hashes, refresh tokens and identity secrets are never returned in profile/list responses.

## Banner storage and publication

Uploads accept JPG, PNG or WebP up to 4 MB. The server decodes them with a 20-million-pixel limit, rotates and resizes inside 1600x800, strips source metadata through conversion and stores WebP bytes in PostgreSQL. The portal recommends a 2.8:1 landscape image with important content inside the safe area. Images are not accepted merely by trusting a file extension.

Public app endpoints are:

- `GET /api/v1/home/banners`: up to ten published banners in display order.
- `GET /api/v1/home/banners/:id/image`: published WebP image only; draft access is rejected.

Draft image previews use the authenticated admin image endpoint. The public list is no-cache and image responses can be cached for five minutes; unpublishing removes the banner from new lists, while an already cached image can persist until cache expiry. Home keeps its built-in artwork if content is unavailable.

## Weather configuration

Set `OPENWEATHER_API_KEY` in the backend's private environment to enable city weather. `GET /api/v1/home/weather` requires an authenticated account, reads its profile city, geocodes that city through OpenWeather and requests current metric weather. The key stays on the server. Responses contain city, rounded Celsius temperature, condition and observation time. Successful city results have a 15-minute bounded cache. Missing city/key, provider errors or invalid data return an unavailable state; no sample weather is substituted.

Provider references: [current weather](https://openweathermap.org/api/current) and [geocoding](https://openweathermap.org/api/geocoding-api). Configure a provider account suitable for the deployment's usage. This implementation does not establish that a production key has been provisioned.

## Deployment and evidence

The implementation and migrations are prepared locally. This document does not claim production deployment, a production migration run or creation of a production administrator. Run the seeder explicitly after migration with private credentials.

The parent reported successful source/build checks, backend role/banner HTTP journeys, and synthetic desktop/narrow browser compositions. Final test counts and APK details belong to the final build report. Native app permission, sync and physical-device acceptance remain separate work.
