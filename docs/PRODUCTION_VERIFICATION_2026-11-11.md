# Production verification - 11 November 2026

**Core deployed flows pass. Production is not fully cleared:** compiled server
files are publicly served, reviewed care catalogs are empty, and device/provider
acceptance remains incomplete.

Target: https://backend.arogio.com/api/v1. Local source commit: 27f9aa8.
The user deployed the backend; this run did not change hosting configuration.

| Verification group | Actual result |
|---|---|
| Initial deployment smoke | 6/6 passed: liveness, database readiness, validation and access guards |
| Mobile contracts/content/error cases | 22/22 passed against live responses using current mobile schemas |
| Authenticated production flows | 9/9 passed through the actual APK HTTP client/auth schemas |
| APK46 guest integration | 10/10 passed in temporary read-only Pixel3a/API34 emulator; crash buffer clean |
| Hosting boundary acceptance | 7/8 passed; /dist/main.js still exposes compiled server code |
| Proposed hosting rule patterns | 2 local tests passed; backend lint passed; actual Apache syntax/routing not yet verified |

## Working live

- Signup, saved setup, login/resume/completion, token refresh, logout and revoked-refresh rejection.
- Activity goals/readings persist after reload; partial updates preserve earlier values.
- Water plan/log and disabled medicine reminder persist.
- Separate accounts cannot see each other's tracking; regular accounts cannot access admin APIs.
- Export returns the correct authenticated owner and retained tracking.
- 284 articles; sampled list pages have distinct stable IDs, and sampled detail has English/Hindi content.
- 6 published meditation items: 2 videos and 4 practices, all with Hindi titles.
- APK loads live article list/detail and the published practice description without service-error fallbacks.
- Both video IDs have available YouTube metadata. One embed was explicitly played and video frames observed. Audible playback was not verified on the silent emulator.
- Guest emergency and private-health guard work. No call was placed.
- Search, unsupported city, malformed inputs, missing records, nearby contact read/private cache and CORS allowlist pass.
- Five admin scripts match local dist after CRLF normalization; no stale-script mismatch was found.

## Open findings

1. **P1: public server implementation.** GET /dist/main.js returns 200,
   text/javascript, 702 bytes identical to local compiled main.js, not fallback
   HTML. Tested /.env and /.env.production HEAD requests return 403; no secret-file
   body was fetched. This does not establish protection of every private path.
2. **Empty reviewed catalogs:** hospitals, doctors, medicine education and reviewed
   blood banks each return zero records. The APIs and empty states work, but users
   cannot find providers until real records are imported, reviewed and published.
   No synthetic public listing was created.
3. **Still unverified:** physical Health Connect/watch/steps/GPS, notifications
   across reboot/timezone/revocation, actual Google-account sign-in, live Jeeva and
   other provider-backed flows, audible media, and full accessibility/device coverage.
   No load test was performed; 3M simultaneous-user support is not demonstrated.
4. Admin pages/assets/guards were tested, but publication/correction review was
   not exercised against real public records. Readiness and catalog calls do not
   prove every unexercised migration path or admin operation.

## Cleanup

After explicit user approval, two synthetic QA accounts were created. Both were
soft-deleted, their test activity/water/medicine data cleared, sessions revoked,
and subsequent profile access rejected. Existing 30-day recovery retention applies;
this was not hard deletion. No real user data or public content was changed.
Credentials and tokens stayed in memory and were not written into reports.

## Required next action

Apply the [hosting correction](PRODUCTION_FILE_EXPOSURE_FIX.md). Prefer an
application root outside the public document root; otherwise merge the
[scoped rule fragment](../hosting/apache-private-files.htaccess) into the existing
hosting-managed .htaccess while preserving Passenger directives. It is prepared
locally, **not installed**. Hosting-owner application and a live retest are required.

```sh
node scripts/check-hosting-boundary.mjs https://backend.arogio.com
node scripts/smoke-api.mjs https://backend.arogio.com/api/v1
```

The first command currently exits 1 for the confirmed exposure. All eight checks
must pass after correction while API/admin assets remain available. Public care
data needs its data/clinical owner; device/provider checks need the corresponding
real devices/accounts. No APK rebuild is required solely for this hosting fix.

## Evidence

- [Sanitized machine summary](qa/production-2026-11-11.json).
- Local raw results/logs: .tmp/production-2026-11-11/ (ignored by Git).
- Native screenshots/XML/results: D:/arogio-health-app/.impeccable/review/production-2026-11-11/.
- Read-only acceptance tool: scripts/check-hosting-boundary.mjs.
- Mutation scripts are archived behind an approval flag. Do not automatically rerun
  them; this run's authorization covered the two accounts already cleaned up.
