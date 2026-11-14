# Stitch revamp audit - 14 November 2026

The archive is design reference, not authorization to reproduce fabricated availability, prices, qualifications or booking actions. This audit covers the implemented mobile app and its NestJS/Drizzle API, not every aspirational feature described in the archive.

## Completed corrections

- Frontend regressions updated for the private Profile tab and shared medicine schedule. Existing account isolation and notification-denial behavior remain covered.
- Dose records are validated before rendering; a successful HTTP status alone cannot confirm a saved dose change.
- Snooze requires a due dose, an enabled reminder, current notification access and a same-day destination in IST. Permission checks do not request access. Completed doses must be undone before snoozing; retrying an active snooze preserves its time.
- The medicine screen can progressively show all scheduled doses. Home and My Health retain compact schedules and a route to full management.
- Wellness reads explicitly disallow shared caching. Personal export describes the 90-day water and medicine-dose window. The dose table cascades on hard user deletion and dose records are removed when the medicine is deleted.
- Local PGlite migration startup now executes historical SQL batches correctly, transactionally records migration hashes, and preserves all existing migration files. Repeating migration startup is covered by a regression test.
- DESIGN.md and its sidecar reflect the implemented palette and centre Jeeva/private Profile navigation.

## API additions and rollout order

1. Back up the target database and apply pending migrations with the existing production migration process. Migration `0017_lean_doorman.sql` creates `medicine_doses` and its account/day index. It has been exercised locally, not applied to hosting by this audit.
2. Deploy the rebuilt backend before releasing the matching mobile bundle.
3. Verify public `GET /api/v1/home/discovery` returns separate hospital/doctor sections, each with `status` (`available` or `unavailable`) and `items`. Both use the directory's public publication, Jaipur and freshness filters. Empty is distinct from failed; availability always requires contacting the provider.
4. Verify authenticated `GET /api/v1/wellness` contains `medicineDoses` and uses `Cache-Control: private, no-store`.
5. Verify authenticated `PUT /api/v1/wellness/medicines/:id/doses/:day/:time` accepts `{status: 'taken'|'skipped'|'pending', snooze?: boolean}`. `snooze: true` is valid only for pending doses. Writes validate medicine ownership and its configured dose time; clients cannot set another owner or supply arbitrary snooze timestamps.
6. Rebuild/release the mobile app and perform the device acceptance checks below. An older server without `medicineDoses` keeps reminder management available but the frontend does not advertise dose logging.

## Still required

| Area | Outstanding work |
|---|---|
| Deployment | Apply the new migration and deploy this backend/mobile version together; neither happened in this audit. |
| Native UI acceptance | Compare actual Android/iOS phone and tablet renders with the supplied references, including dark mode, Hindi, enlarged text, keyboard, back navigation and guest/account states. JavaScript exports are compilation evidence, not screenshots or an installed APK/IPA. |
| Device behavior | Confirm real notification sound/delivery, snooze/cancel after logging, denied/revoked access, resume/reboot, foreground steps, Health Connect and GPS on physical devices. |
| Real catalogs | Import, source-review and publish approved providers/medicine education. Mockup ratings, beds, stock, prices and appointments are not real data sources. |
| Existing hosting finding | The 11 November verification recorded public access to compiled `/dist/main.js`; confirm the prepared hosting rules are installed and retest. This audit did not retest or modify production hosting. |
| Existing service gates | Operational recovery, actual Google sign-in/provider-backed Jeeva, clinical/legal review and release acceptance remain governed by the existing readiness checklist. |
| Broader modules | Family/records/bookings, saved-item services, quizzes, remedies and schemes are not completed merely by this UI revamp. See the app's redesign scope and readiness matrix. |

No production account, provider listing or clinical record was created for these checks. Newly collected dose logs are included in the private wellness export; they are not newly transmitted to Jeeva by this change.

## Local verification

- Frontend: lint, TypeScript and 156 tests passed.
- Backend: build, lint, 112 unit tests, 50 integration tests and Drizzle metadata consistency passed. The final completed/skipped snooze guard also received a focused wellness integration rerun.
- Web and Android JavaScript exports compiled. Review artifacts are under the app's `dist/stitch-review-web` and `dist/stitch-review-android` directories; the Android artifact is a Hermes bundle, not an installable APK.
- A disposable local backend started successfully through the repaired migration runner. A guest HTTP smoke read confirmed discovery returns HTTP 200, `Cache-Control: no-store`, available-but-empty reviewed catalogs and `contact-provider` availability. The temporary backend was stopped afterward.
- No new native screenshots, physical-device acceptance, production migration or hosted service verification were performed.
