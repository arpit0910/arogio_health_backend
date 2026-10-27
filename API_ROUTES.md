# API routes and request diagnostics

Base URL: `https://backend.arogio.com/api/v1`. The status homepage remains at `https://backend.arogio.com/`.

| Method | Canonical route           | Purpose                              | Existing APK alias  |
| ------ | ------------------------- | ------------------------------------ | ------------------- |
| POST   | `/auth/email/register`    | Create an email/password account     | `/auth/register`    |
| POST   | `/auth/email/login`       | Email/password login                 | `/auth/login`       |
| POST   | `/auth/google/login`      | Verify a Google ID token and sign in | `/auth/google`      |
| POST   | `/auth/tokens/refresh`    | Rotate refresh credentials           | `/auth/refresh`     |
| POST   | `/auth/logout`            | Revoke a refresh session             | Unchanged           |
| GET    | `/users/me`               | Current authenticated profile        | Unchanged           |
| PATCH  | `/users/me`               | Edit current profile                 | Unchanged           |
| PATCH  | `/users/me/profile-setup` | Save/complete onboarding             | `/users/me/setup`   |
| GET    | `/health/liveness`        | API process health                   | `/health`           |
| GET    | `/health/readiness`       | Database connectivity                | `/ready`            |
| GET    | `/monitoring/requests`    | Sanitized request activity           | `/diagnostics`      |
| GET    | `/monitoring/ping`        | Harmless connection probe            | `/diagnostics/ping` |

Both route sets are supported. Deploy the backend before distributing an app using the canonical routes. The existing APK continues to use its aliases. URL naming did not cause the earlier signup/login HTTP 500s; those operations passed after database migrations were applied.

## Understand the response

Expand **View details** in a request row to see:

- Server-generated request ID (also returned as `x-request-id`).
- Method, registered route pattern, HTTP status and duration.
- Authentication state: `absent`, `provided`, or `authenticated`. `provided` does not mean the token is valid.
- Response content type and content length, where available.
- Sanitized outcome, error code, reason and allowlisted invalid field names.
- Recognized database error codes and a safe explanation when the original failure provides one.

The public monitor deliberately does not copy full request or response bodies: authentication responses contain tokens and profile responses contain personal/health data. It also omits arbitrary exception messages, SQL, SQL parameters, client-supplied request IDs, IP addresses, cookies, headers and query strings. Successful responses get a generic success summary. Unknown 500s remain explicitly unknown and must be correlated with server logs; the monitor does not guess their cause.

| HTTP/code                      | Meaning                                                 |
| ------------------------------ | ------------------------------------------------------- |
| 400 `VALIDATION_FAILED`        | Invalid/missing request fields                          |
| 401 `ACCESS_TOKEN_REQUIRED`    | Protected endpoint called without a Bearer access token |
| 401 `ACCESS_TOKEN_EXPIRED`     | Refresh the session or sign in again                    |
| 401 `INVALID_ACCESS_TOKEN`     | Invalid token/signature/issuer/audience                 |
| 401 `INVALID_CREDENTIALS`      | Email/password login failed                             |
| 401 `INVALID_GOOGLE_TOKEN`     | Google ID-token verification failed                     |
| 500 with database code `42P01` | Required database table is missing                      |
| 500 with database code `42703` | Required database column is missing                     |
| 500 with database code `42501` | Database permissions are insufficient                   |

The smoke checks intentionally make unauthenticated or invalid requests to verify guards and validation. Updated test scripts send `x-arogio-diagnostic: smoke-test`; these calls are grouped with probes and hidden unless **Include diagnostic probes** is enabled. This is a client-reported diagnostic label, not a trusted identity or security audit classification. Older test calls made before this deployment remain ordinary API rows until the process restarts/retention expires.

## Run checks

Existing harmless smoke checks (no accounts or profile writes):

```sh
node scripts/smoke-api.mjs https://backend.arogio.com/api/v1
```

Explicit deployed account-flow test, run locally with the app repository next to this backend repository:

```sh
node --experimental-strip-types scripts/test-deployed-app-client.mjs --create-test-account
```

Use `--legacy` to test a deployed server before canonical routes have been released. This uses the app's real HTTP client and response schemas, creates a generated account in production, tests setup/resume/completion/login/refresh/logout, and revokes all issued test sessions. The generated test account remains in the database. No credentials or tokens are printed. A real Google authorization still requires a device and correct Google Cloud configuration.

If no terminal is available, use the hosting Node application manager's **Run JS script / Run Script** control, select `db:diagnose`, and inspect its JSON output. To apply reviewed pending migrations after a backup, select `db:migrate:production` in that same control. These are existing package scripts; no public migration endpoint is exposed.
