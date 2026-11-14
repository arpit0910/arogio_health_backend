# Live account test results and next checks

**Update after production migrations:** live email signup returned HTTP 201, login HTTP 200, and logout HTTP 204. The full app-transport test also passed saved setup/resume, all setup steps, review edits, completion, profile retrieval, login, refresh, logout and revoked-token rejection. All test sessions were revoked; generated test accounts remain. The failures below describe the earlier state before migrations. The exact earlier PostgreSQL error code was not retrieved, so no particular missing table/column is claimed. Native Google authorization remains unverified. See [API_ROUTES.md](./API_ROUTES.md) for the new canonical routes and monitor details.

The production API was tested with generated, isolated credentials. The personal credentials visible in the user's screenshot were not used or copied into source.

## Confirmed results

- `/api/v1/health`: HTTP 200, valid Arogio JSON.
- `/api/v1/ready`: HTTP 200. This only checks `SELECT 1`, not application tables or migrations.
- Unauthenticated profile/setup access and invalid Google tokens return the expected JSON errors.
- Valid registration: HTTP 500 `INTERNAL_ERROR`, request ID `2bdc1142-2b95-47d5-a4e7-a9061b904c72`.
- Login with the same generated credentials: HTTP 500 `INTERNAL_ERROR`, request ID `4b33ecf2-dbec-409d-9fea-42222261dcb2`.
- A deliberately invalid email with an eight-character valid password still reports the **12-character** password rule. The production backend has not received the eight-character policy changes yet.

The shared failure in account database operations is consistent with a missing/outdated schema or database permissions, but the underlying PostgreSQL error has not yet been obtained. A successful readiness check does not establish that these operations work. No production migrations were applied by this test. No signup success or issued session was observed.

## Diagnose in the hosting Node app environment

Pull the new backend files, including `scripts/check-database.cjs`, `package.json`, source and rebuilt `dist/`. In the hosting Node app environment (the same environment holding its production `DATABASE_URL`), run:

```sh
npm run db:diagnose
```

The diagnostic opens a read-only transaction, compares the required tables/columns with the compiled schema, checks whether Drizzle's migration history exists, and closes the connection. It does not read user records, run migrations or print the connection URL. Share the resulting JSON; it contains no database credentials.

If tables or columns are missing, confirm the target database, take the normal backup, then apply the committed migrations:

```sh
npm run db:migrate:production
```

If the schema check passes, reproduce the failed action once and find `unhandled_api_error` in the hosting logs. The updated exception filter logs only the request ID and a structured database error code, never SQL or parameters. Common PostgreSQL codes: `42P01` missing table; `42703` missing column; `42501` insufficient privilege. Keep internal diagnostic details out of the public API response.

A direct metadata check using this computer's `.env.production` failed with `SELF_SIGNED_CERT_IN_CHAIN`, even with the system CA store enabled. Certificate verification was not disabled. This does not prove the live host has the same TLS problem: its readiness endpoint succeeds, and its connection settings may differ.

## Google error in the APK

The screenshot's Google message is emitted by the app for native `DEVELOPER_ERROR` / code `10`. It indicates a client configuration mismatch before backend token login, separate from the email API's HTTP 500.

For the distributed EAS APK (verified build 5), register an **Android OAuth client** in the same Google Cloud project as the Web client with:

- Package: `com.arogio.health`
- SHA-1: `CD:D6:E8:F9:74:AB:F3:E8:1E:65:32:D0:4C:AD:3E:96:6D:BF:EB:B6`

The local debug fingerprint `6B:D7:02:D6:96:2B:4A:B0:67:06:CD:ED:39:DF:95:69:CA:2E:D9:45` does not cover that APK. Keep the existing Android client for debug testing and create the release client if needed. The app's `webClientId` and backend audience remain the Web client `987857172312-fil8ani3esi0j9gsg095c6tg1utcbm2j.apps.googleusercontent.com`. Do not use an Android client ID as `webClientId` or copy the Web client secret into the APK.

References: [Google sign-in troubleshooting](https://react-native-google-signin.github.io/docs/troubleshooting), [Android OAuth configuration](https://react-native-google-signin.github.io/docs/setting-up/get-config-file?firebase-or-not=cloud-console).

A real Google success test needs the release OAuth registration and account authorization on the device. Invalid-token backend tests do not verify that interaction. Build 5 also retains the old app-side twelve-character rule; a new APK is needed for the recently requested eight-character policy.
