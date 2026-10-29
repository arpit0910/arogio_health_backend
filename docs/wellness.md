# Wellness API

All routes are under `/api/v1/wellness`, guarded by the existing bearer JWT guard. Every lookup, modification and deletion is scoped to the authenticated account. Per-account row locks serialize mutations, including period overlap validation and idempotent water logging. Input schemas are strict and reject caller-supplied ownership fields.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Account settings and tracking snapshot |
| PUT | `/water/plan` | Target, serving, waking hours, timezone, reminders, pause |
| PUT | `/water/logs/:uuid` | Idempotent water log |
| DELETE | `/water/logs/:uuid` | Undo water log |
| PUT | `/water/tasks/:taskId` | Skip, restore or snooze a current task |
| DELETE | `/water/data` | Remove all water settings and logs |
| PUT | `/cycle/settings` | Estimate and reminder preferences |
| PUT | `/cycle/periods/:uuid` | Create or edit period dates |
| DELETE | `/cycle/periods/:uuid` | Remove period record |
| PUT | `/cycle/entries/:date` | Upsert flow, symptoms, mood and notes |
| DELETE | `/cycle/entries/:date` | Remove daily entry |
| DELETE | `/cycle/data` | Remove cycle settings and all cycle records |

Water settings accept `wakeTime`, `sleepTime` (HH:mm), `targetMl` (100–6000), `servingMl` (50–1000), `timezone` (IANA), `remindersEnabled`, `pausedUntil` (ISO instant or null). These are storage/input limits, not a prescribed fluid recommendation. Wake windows must be 2–22 hours. The server owns schedule version UUIDs. Pauses may be at most 31 days ahead.

Water logs accept `amountMl` (1–3000), `loggedAt` (ISO instant within seven days, up to one minute clock skew), `taskId` (nullable). The server calculates waking day and captures the target at logging time. Reusing an ID with different content conflicts. A task may be logged only once and must match its remaining amount. Quick logs have no task ID.

Cycle settings accept `cycleLength` (10–120), `periodLength` (1–30), `predictionsEnabled`, `remindersEnabled`, `discreet`, `reminderDaysBefore` (0–7), `reminderTime` (HH:mm), `timezone`. Period dates use plain YYYY-MM-DD; `endDate:null` means ongoing. Daily entry fields and allowed values are defined in `wellness.input.ts`. Notes are limited to 1,000 characters; symptom duplicates and unknown values are rejected.

Snapshot reads return the last 90 days of water data (up to 3,000 logs), all period records, and the latest 730 daily check-ins. Data deletion removes all records, including those outside the snapshot. Body contents and raw wellness route parameters are not included in request logs; the existing public diagnostic monitor uses registered route patterns and safe summaries.

## Deployment

1. Back up the hosted PostgreSQL database using the existing operational process.
2. Review additive migration `drizzle/0005_majestic_skreet.sql` (five tables, account FKs and constraints).
3. Build the backend and run its existing production migration command against the intended environment, then deploy the new application version.
4. Verify authenticated snapshot, plan/log round-trip and CORS PUT preflight against the deployed URL.
5. Build a fresh app binary with the notifications config plugin; run device acceptance in the companion app's `docs/wellness-tracking.md`.

No hosted migration or deployment is performed by adding these source files. There is no server notification job; notifications are scheduled locally by the app.

HTTP integration verification: `npm run test:e2e -- --testPathPatterns=wellness`. Tests use synthetic accounts and disposable PGlite, never the hosted database.

## Activity targets and entered totals

The snapshot includes `activityTracking: { goals, days }`. Authenticated PUT `/wellness/activity/goals` merges `{goals}`; PUT `/wellness/activity/days/:day` merges `{values}` into that day's totals. Null clears a field; zero remains a reading. Separate metric keys are Steps, ActiveCaloriesBurned, Nutrition (food calories), Distance (km), ExerciseSession (minutes), and SleepSession (hours). DELETE `/wellness/activity/data` clears only activity tracking.

Dates must be within the last 90 days through today in Asia/Kolkata. Entries are replacement totals, not increments. Input limits are storage validation, not recommended health targets. Owner-scoped mutations use the existing user row lock. Connected raw readings and local phone step counts are not uploaded by these routes.

Deploy additive migration `drizzle/0007_daily_activity_targets.sql` before serving this version. No hosted migration or deployment was performed during implementation. Activity HTTP tests cover account isolation, validation, repeated saves, separate calorie fields and deletion using disposable PGlite.
