# APK testing release check — 2026-10-26

Local result: backend build/lint, 34 unit/integration tests, 14 HTTP tests, migration consistency, and app lint/typecheck plus 30 tests pass. The Android production JavaScript/Hermes bundle also compiles successfully. The five new HTTP journeys and smoke checks run actual Nest controllers, validation, JWT guards, services, Argon2, repositories, profile persistence, and refresh/logout against disposable PostgreSQL-compatible PGlite. No hosted database was changed.

Covered: signup, partial profile saving, login/resume, all setup steps, review edits, completion, idempotent retry, completed-profile login, refresh rotation, logout, duplicate signup, malformed details, authorization, Google account creation/restoration, and prevention of automatic password-account linking.

Google tests use real RSA signature/audience/issuer/expiry verification in the installed Google library, with a synthetic trusted certificate set injected in the test only. Real Google authorization, Android registration and device UI are not established by those tests. Native app tests also cover cancellation, missing ID tokens, Play Services and client configuration.

Fixed during this check:

- Partial PATCH DTOs contained undefined class fields which erased previous steps. Merge now ignores omitted fields.
- Drizzle wraps PostgreSQL constraint errors in `cause`. Duplicate email/username errors now return conflicts instead of internal server errors.
- App's default Google client fallback and example configuration now use the supplied Web client.

## Google credentials

The supplied JSON is a Web application client for project `arogio-health`:
`987857172312-fil8ani3esi0j9gsg095c6tg1utcbm2j.apps.googleusercontent.com`.
This matches the APK build profile and backend accepted audiences. Its client secret was not copied into the application or this package; ID-token verification does not need it.

The downloaded client file contains no browser origins or redirect URIs. Browser authorization needs those configured in Google Cloud for each browser deployment. This does not substitute for Android registration.

In [Google Cloud credentials](https://console.cloud.google.com/apis/credentials?project=arogio-health), verify an Android OAuth client with:

- Package: `com.arogio.health`
- APK signing SHA-1: `CD:D6:E8:F9:74:AB:F3:E8:1E:65:32:D0:4C:AD:3E:96:6D:BF:EB:B6`

The fingerprint was verified from `dist/arogio-health-preview.apk` with Android apksigner. That existing APK is version 1.0.0, contains the old Google client ID, and does not contain the setup route. It cannot test the new implementation. A new preview build is required after backend deployment. No Android device was connected at check time.

## Hosted API remains blocked

On 2026-10-26, `/health` and `/ready` returned the Node hosting sample page (HTTP 200 text/plain). `/users/me`, `/auth/login`, and `/auth/google` returned HTTP 503 HTML. No accounts were created on that host. Deployment is required before APK network testing.

## Deploy this package

1. Extract into the hosting Node application's root; preserve existing private environment settings. Use Node 22 and startup file `app.js`.
2. Run `npm ci --omit=dev` on Linux. Do not upload Windows node_modules. This package includes the built `dist` directory.
3. Set the real `DATABASE_URL`, signing secrets, `CORS_ORIGINS`, and `GOOGLE_CLIENT_IDS` through the hosting environment or private `.env`. Nest does not automatically load `.env.production`.
4. Take the usual database backup, then run `npm run db:migrate:production` using the intended database. This applies the included migrations, including profile setup migration 0004, without development dependencies.
5. Restart the hosting Node application and run `node scripts/smoke-api.mjs https://backend.arogio.com/api/v1`. All six checks must pass.
6. Build a new APK from `D:/arogio-health-app` with `npx eas-cli@latest build --platform android --profile preview`; verify its signing certificate still matches Google Cloud.
7. On the new APK, test email signup through completion, relaunch/resume, logout/login, Google account selection, Google cancellation and Google login after profile completion. Real Google sign-in remains unverified until this succeeds.

No production deployment, production migration, new EAS build, or native visual/runtime approval is claimed by this check.
