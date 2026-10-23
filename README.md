# Arogio Health Backend

NestJS, TypeScript, PostgreSQL, and Drizzle backend foundation for Arogio Health. The current scope ends at authentication and the authenticated user profile; hospital, doctor, and other healthcare-domain modules are intentionally excluded.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the architecture, scope, and delivery decisions.

## Implemented

- Versioned REST API at `/api/v1`.
- PostgreSQL schema and versioned Drizzle migrations for users, external identities, and refresh sessions.
- Liveness and database-readiness checks.
- Email/password registration and login using Argon2id, with optional height/weight collection.
- Backend Google ID-token verification.
- Short-lived JWT access tokens and rotating opaque refresh tokens.
- Refresh-token reuse detection and token-family revocation.
- Logout and authenticated profile read/update endpoints.
- DTO validation, stable error responses, request IDs, redacted structured logs, security headers, CORS allowlisting, body limits, and endpoint throttling.
- OpenAPI/Swagger documentation generated from the implementation.
- Unit, migration/constraint, repository-flow, and API e2e tests.

Mobile OTP is only represented by a future provider boundary. There are no OTP endpoints or fake production SMS behavior.

## Requirements

- Node.js 22 LTS is recommended. Minimum supported version: Node.js 20.19.
- npm.
- A PostgreSQL database. The project is prepared for the existing Supabase PostgreSQL project.

## Supabase connection

In the Supabase dashboard:

1. Open the project.
2. Click **Connect** at the top.
3. Copy the **Direct connection** URI if the machine or persistent backend has IPv6 connectivity.
4. If the network is IPv4-only, copy the **Session pooler** URI on port `5432` instead.
5. Replace `[YOUR-PASSWORD]` with the project's database password. Percent-encode reserved password characters such as `@`, `#`, `?`, `/`, and spaces.

Use direct or session-mode connections for Drizzle migrations. Do not use the transaction-mode URL on port `6543` for migrations.

Never place the connection string in source control, screenshots, issue trackers, or chat messages.

## Local setup

Install dependencies:

```bash
npm install
```

Create the local environment file:

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Edit `.env` and provide at least:

```dotenv
DATABASE_URL=postgresql://the-supabase-connection-string
JWT_ACCESS_SECRET=a-random-secret-with-at-least-32-characters
GOOGLE_CLIENT_IDS=web-client.apps.googleusercontent.com,android-client.apps.googleusercontent.com
CORS_ORIGINS=http://localhost:3000,http://localhost:8081
```

Generate `JWT_ACCESS_SECRET` with a cryptographically secure secret manager or random generator. Do not reuse the Supabase password.

Apply the committed migrations:

```bash
npm run db:migrate
```

Start the API:

```bash
npm run start:dev
```

The default endpoints are:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Liveness: `http://localhost:3000/api/v1/health`
- Readiness: `http://localhost:3000/api/v1/ready`

Disable Swagger in an exposed environment unless it is intentionally required by setting `SWAGGER_ENABLED=false`.

## Google configuration

Create OAuth client IDs for each supported client type in Google Cloud. Add every ID whose Google ID tokens the API should accept to the comma-separated `GOOGLE_CLIENT_IDS` value.

The mobile or web client sends its Google ID token to `POST /api/v1/auth/google`. The backend validates the token signature, issuer, expiry, and audience, then uses Google's stable `sub` claim as the identity key.

The API deliberately does not:

- Trust a client-supplied Google email or name.
- Store Google ID/access tokens.
- Automatically merge a Google identity into a password account just because the emails match.

When an email collision requires a future authenticated linking flow, the API returns `ACCOUNT_LINK_REQUIRED`.

## API

| Method  | Path                    | Authentication      | Description                     |
| ------- | ----------------------- | ------------------- | ------------------------------- |
| `GET`   | `/api/v1/health`        | None                | Process liveness                |
| `GET`   | `/api/v1/ready`         | None                | Database readiness              |
| `POST`  | `/api/v1/auth/register` | None                | Email/password registration     |
| `POST`  | `/api/v1/auth/login`    | None                | Email/password login            |
| `POST`  | `/api/v1/auth/google`   | None                | Google login/registration       |
| `POST`  | `/api/v1/auth/refresh`  | Refresh token body  | Rotate credentials              |
| `POST`  | `/api/v1/auth/logout`   | Refresh token body  | Revoke the refresh session      |
| `GET`   | `/api/v1/users/me`      | Bearer access token | Read the current profile        |
| `PATCH` | `/api/v1/users/me`      | Bearer access token | Update profile and measurements |

Swagger contains the current request and response schemas.

### Height, weight, and BMI

`heightValue` and `heightUnit` are an optional pair: use `cm` (50–300) or total `in` (20–120). `weightValue` and `weightUnit` are another optional pair: use `kg` (2–500) or `lb` (4.4–1102.3). They may be provided at email signup or through `PATCH /api/v1/users/me` after Google signup. The API preserves the entered values and selected units, while normalizing internally to metric values for BMI. It returns `bmi` when both measurements are present; BMI is derived, rounded to one decimal place, and never accepted as client input.

Example signup or profile payload:

```json
{
  "heightValue": 68,
  "heightUnit": "in",
  "weightValue": 150.8,
  "weightUnit": "lb"
}
```

### Mobile token flow

1. Register/login returns an access token and a refresh token.
2. Keep the access token in application memory when practical.
3. Store the refresh token only in iOS Keychain or Android Keystore-backed secure storage.
4. Send the access token as `Authorization: Bearer <token>`.
5. On access-token expiry, call `/auth/refresh` once and atomically replace both stored tokens with the response.
6. If refresh returns `INVALID_REFRESH_TOKEN`, clear the local session and require login.
7. Call `/auth/logout` before clearing the local refresh token when the user explicitly signs out.

Refresh tokens are one-time credentials. Reusing an already-rotated token revokes its active token family as a theft precaution. Parallel refresh requests from one client should therefore be prevented with a client-side single-flight/mutex.

## Error contract

Failures use a stable envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": {
      "email": ["email must be an email"]
    },
    "requestId": "request-correlation-id",
    "timestamp": "2026-10-20T00:00:00.000Z",
    "path": "/api/v1/auth/register"
  }
}
```

Send the `x-request-id` response value with bug reports so server logs can be correlated without exposing credentials.

## Database changes

Drizzle TypeScript schemas in `src/database/schema` are the application source of truth. Generated SQL in `drizzle` is committed and applied in order.

After an approved schema change:

```bash
npm run db:generate
npm run db:check
npm run db:migrate
```

Review generated SQL before applying it. Never edit production tables manually or use destructive schema synchronization.

## Verification

```bash
npm run format:check
npm run lint
npm run build
npm test
npm run test:e2e
npm audit --omit=dev
```

Unit tests use mocks for Google. Migration and database-constraint tests run with embedded PGlite, so ordinary CI does not require live Google credentials or a shared database. The real Supabase migration still needs to be run separately against the configured `DATABASE_URL`.

## Scaling model

The API is designed to scale horizontally:

- Access-token validation is stateless.
- Refresh state and uniqueness/concurrency rules live in PostgreSQL.
- Account and identity creation uses transactions and database constraints.
- Queries use indexed email, username, mobile number, identity, user-session, token-family, and expiry fields.
- Database pool size is configurable per process. Total pools across all instances must remain below the Supabase connection limit.
- Logs are structured, request-correlated, and redact authentication values.
- Health and readiness are separate so an orchestrator can stop routing traffic to an instance whose database is unavailable.

The current throttler is per API instance. Before operating many instances or exposing the API at large public scale, enforce distributed limits at the API gateway/edge or configure a shared throttler store. Millions of users also require measured load tests, query monitoring, session-retention cleanup, backups/restore drills, alerting, and capacity planning; folder structure alone cannot prove that capacity.

## Production gates

Before public release:

- Upgrade the runtime to the recommended Node.js 22 LTS line.
- Use HTTPS and a production secret manager.
- Confirm CORS origins and disable unnecessary Swagger exposure.
- Configure edge/distributed rate limiting and abuse monitoring.
- Add a scheduled expired-session cleanup process.
- Run load tests using expected login/refresh traffic and tune pool limits from measurements.
- Configure monitoring, alerts, backups, restore drills, and credential rotation.
- Implement email verification and password reset with a selected email provider.
- Perform a separate privacy/security/regulatory review before storing real health information.

## Scripts

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `npm run start:dev`    | Start with file watching                               |
| `npm run build`        | Compile the production application                     |
| `npm start`            | Run the compiled application                           |
| `npm run lint`         | Run strict ESLint checks                               |
| `npm run format:check` | Verify formatting                                      |
| `npm test`             | Unit, migration, constraint, and repository-flow tests |
| `npm run test:e2e`     | HTTP/API boundary tests                                |
| `npm run db:generate`  | Generate reviewed migrations from schema changes       |
| `npm run db:check`     | Check migration consistency                            |
| `npm run db:migrate`   | Apply committed migrations                             |
