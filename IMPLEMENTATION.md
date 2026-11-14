# Arogio Health Backend — Implementation Plan

This document is the source of truth for the first Arogio Health backend implementation. It consolidates the decisions in the [project discussion](https://chatgpt.com/share/6ad6f8f7-1e00-83ec-8812-fb499372bf1b) and adapts them to the current repository, which is a greenfield repository containing only a README.

Last updated: 20 October 2026

## 1. Goal

Build a maintainable backend foundation that can serve the Arogio website and a future React Native application without duplicating business logic between clients.

The first delivery must provide:

- A NestJS REST API under `/api/v1`.
- PostgreSQL access through Drizzle ORM and versioned Drizzle Kit migrations.
- Liveness and database-readiness endpoints.
- Email/password registration and login.
- Google Sign-In through server-side Google ID-token verification.
- A secure access-token and refresh-session lifecycle.
- Authenticated user profile read/update endpoints.
- Validation, consistent errors, request IDs, structured logging, security headers, CORS configuration, rate limiting, and OpenAPI documentation.
- Automated tests and reproducible local setup instructions.

## 2. Scope boundary

### In scope

- NestJS modular-monolith project setup.
- Environment validation and safe configuration.
- PostgreSQL connection pooling and graceful shutdown.
- Drizzle schema, migrations, and migration verification.
- Users, authentication identities, and refresh sessions.
- Email/password authentication.
- Google authentication using the verified Google `sub` claim.
- A mobile OTP provider contract and documented future flow only.
- Health, readiness, authentication, and self-profile APIs.
- Unit, integration, and end-to-end tests.
- Developer and deployment documentation.

### Explicitly out of scope

- Hospitals, doctors, blood banks, appointments, health records, health tracking, Jeeva AI, and articles.
- The website or React Native application.
- Real SMS sending or a working OTP login flow.
- Email delivery, email verification, or password-reset delivery. Extension points may be documented, but must not be presented as operational.
- PostGIS until a location feature is approved.
- Microservices, Redis, BullMQ, Kafka, Kubernetes, or speculative infrastructure.
- Storage of real patient or clinical data.

Do not create empty domain modules, tables, or APIs for future features.

## 3. Locked technical decisions

| Area               | Decision                                                                           |
| ------------------ | ---------------------------------------------------------------------------------- |
| Runtime            | A supported Node.js LTS release                                                    |
| Language           | TypeScript in strict mode                                                          |
| Framework          | NestJS using its default HTTP adapter unless a measured need justifies changing it |
| Architecture       | Modular monolith                                                                   |
| API                | REST, globally prefixed with `/api/v1`                                             |
| Database           | PostgreSQL; Supabase may be used as the managed development database               |
| ORM and migrations | Drizzle ORM and Drizzle Kit; generated SQL migrations are committed                |
| Validation         | NestJS DTOs with `class-validator` and a global validation pipe                    |
| Password hashing   | Argon2id through the `argon2` package                                              |
| Google auth        | Google's supported Node.js verification library behind a mockable service          |
| Access auth        | Short-lived signed JWT access tokens                                               |
| Refresh auth       | Rotating opaque refresh tokens; only a hash is stored in PostgreSQL                |
| API documentation  | OpenAPI/Swagger generated from implemented controllers and DTOs                    |
| Tests              | Jest unit tests plus NestJS/Supertest API tests                                    |
| Logging            | NestJS-compatible structured JSON logger with request IDs and redaction            |

Use existing project conventions once the scaffold exists. Do not add a dependency when the platform or an already-installed dependency provides the required behavior clearly.

## 4. Architecture

Controllers validate transport input and map output. Services own use-case logic. Repositories own Drizzle queries where isolating persistence improves clarity or testability. Infrastructure services wrap external providers such as Google or a future SMS gateway.

```text
HTTP request
  -> request ID / logging / security middleware
  -> DTO validation
  -> controller
  -> application service
  -> repository or external-provider boundary
  -> PostgreSQL / Google verifier
```

Authentication remains stateless for access-token validation. Refresh-session state is stored in PostgreSQL so logout, rotation, expiry, and revocation work across multiple backend instances. No authentication state may depend on process memory.

### Target structure

```text
src/
  main.ts
  app.module.ts
  config/
    env.schema.ts
    configuration.ts
  common/
    auth/
      current-user.decorator.ts
      jwt-auth.guard.ts
    errors/
      api-exception.filter.ts
    logging/
      request-context.middleware.ts
    types/
  database/
    database.module.ts
    database.service.ts
    schema/
      users.schema.ts
      auth-identities.schema.ts
      auth-sessions.schema.ts
      index.ts
  infrastructure/
    google/
      google-token-verifier.service.ts
    sms/
      sms-provider.interface.ts
  modules/
    health/
      health.module.ts
      health.controller.ts
      health.service.ts
    auth/
      dto/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
    users/
      dto/
      users.module.ts
      users.controller.ts
      users.service.ts
      users.repository.ts
drizzle/
test/
```

Names may be adjusted to normal NestJS conventions during implementation, but module boundaries and scope must remain intact.

## 5. Data model

Use UUID primary keys and timezone-aware timestamps. Normalize email addresses by trimming whitespace and lowercasing before lookup/storage. Normalize phone numbers to E.164 before storage when phone support is implemented.

### `users`

| Column               | Type        | Rules                                                                                              |
| -------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `id`                 | UUID        | Primary key; generated by PostgreSQL                                                               |
| `full_name`          | text        | Nullable                                                                                           |
| `username`           | text        | Nullable; unique when present; normalized policy must be documented before exposing username login |
| `email`              | text        | Nullable; unique when present; normalized before storage                                           |
| `email_verified_at`  | timestamptz | Nullable                                                                                           |
| `mobile_number`      | text        | Nullable; unique when present                                                                      |
| `mobile_verified_at` | timestamptz | Nullable                                                                                           |
| `password_hash`      | text        | Nullable for Google-only users; never selected into public response models                         |
| `status`             | enum/text   | `active`, `disabled`, or `pending`; default `active` for currently supported signup flows          |
| `created_at`         | timestamptz | Not null; database default                                                                         |
| `updated_at`         | timestamptz | Not null; updated on mutation                                                                      |

Password credentials live only in `users.password_hash`. They are not duplicated in an identity record.

### `auth_identities`

| Column             | Type        | Rules                                                                         |
| ------------------ | ----------- | ----------------------------------------------------------------------------- |
| `id`               | UUID        | Primary key                                                                   |
| `user_id`          | UUID        | Foreign key to `users.id`; cascade on user deletion                           |
| `provider`         | enum/text   | Initially `google`; reserves `phone_otp` for a later migration/implementation |
| `provider_subject` | text        | Stable verified provider identifier; Google uses `sub`                        |
| `provider_email`   | text        | Nullable metadata; never used alone to link accounts                          |
| `created_at`       | timestamptz | Not null                                                                      |
| `updated_at`       | timestamptz | Not null                                                                      |

Required unique constraint: `(provider, provider_subject)`.

Email/password authentication uses the canonical normalized `users.email` plus `password_hash`; it does not need a redundant `password` identity.

### `auth_sessions`

| Column                   | Type        | Rules                                                             |
| ------------------------ | ----------- | ----------------------------------------------------------------- |
| `id`                     | UUID        | Primary key and public session identifier                         |
| `user_id`                | UUID        | Foreign key to `users.id`; cascade on user deletion               |
| `token_hash`             | text        | Hash of the current opaque refresh token; unique; never return it |
| `family_id`              | UUID        | Groups tokens descended from the same login for reuse detection   |
| `expires_at`             | timestamptz | Required                                                          |
| `revoked_at`             | timestamptz | Nullable                                                          |
| `replaced_by_session_id` | UUID        | Nullable self-reference created during rotation                   |
| `created_at`             | timestamptz | Required                                                          |
| `last_used_at`           | timestamptz | Nullable                                                          |

Do not store raw refresh tokens, Google tokens, passwords, or OTPs.

### Transaction and concurrency rules

- User plus Google identity creation is one transaction.
- Database uniqueness constraints are the final defence against concurrent duplicate registration.
- A duplicate registration conflict returns a safe, consistent client error without leaking internal SQL details.
- Refresh rotation atomically revokes the presented session and creates its replacement.
- Presentation of an already-rotated refresh token revokes its active token family and requires a fresh login.
- A Google identity is never attached to an existing user solely because its verified email matches. Account linking is deferred until a separately authenticated linking flow is designed.

## 6. Authentication behavior

### Email/password registration

1. Validate full name if supplied, email format, and password policy.
2. Normalize the email.
3. Hash the password with configured Argon2id parameters.
4. Create the user, handling unique-email races safely.
5. Create a refresh session and return an access token plus the one-time raw refresh token.
6. Return only the safe user representation.

The API may report that registration cannot proceed for an already-used email. Login failures must remain generic and must not reveal whether an account exists.

### Email/password login

1. Normalize the submitted email.
2. Load the credential record using a query that explicitly includes `password_hash`.
3. Perform password verification without returning different public errors for missing users and bad passwords.
4. Reject disabled users.
5. Create a refresh session and issue tokens.

### Google login

1. Accept an ID token over HTTPS.
2. Verify signature, issuer, expiry, and the configured audience on the backend.
3. Use the verified `sub` as `provider_subject`.
4. If the Google identity exists, sign in its user.
5. Otherwise, transactionally create a new user and Google identity.
6. Do not trust client-supplied email or name, store Google access/ID tokens, or silently merge by email.

Google verification must sit behind an injected interface so ordinary tests use deterministic fakes and never require live Google credentials.

### Access and refresh lifecycle

- Access JWT lifetime: 15 minutes by default, configurable within a reviewed range.
- Refresh lifetime: 30 days by default.
- JWT claims: issuer, audience, subject (`user.id`), issued-at, expiry, and session ID.
- Each refresh rotates both access and refresh credentials.
- Logout revokes the current refresh session. `logout-all` is not part of the initial API.
- Web clients should keep refresh credentials in a Secure, HttpOnly, SameSite cookie when deployed under a compatible origin model. Mobile clients must use OS secure storage. The API transport contract must be finalized before the client is built; raw tokens must never be placed in URLs or logs.
- Signing keys/secrets are environment configuration and must be replaceable without source changes.

### Mobile OTP boundary

Create only a small provider interface if needed by the selected implementation order. Do not expose OTP endpoints until storage, expiry, rate limits, single-use behavior, abuse controls, and an SMS provider are implemented and tested. Local fake OTP behavior must never be enabled in production.

## 7. Initial API contract

Only publish endpoints once their behavior and tests exist.

| Method  | Path                    | Authentication     | Purpose                                                                   |
| ------- | ----------------------- | ------------------ | ------------------------------------------------------------------------- |
| `GET`   | `/api/v1/health`        | None               | Lightweight process liveness; no dependency checks                        |
| `GET`   | `/api/v1/ready`         | None               | Database connectivity readiness; no secrets or detailed failure internals |
| `POST`  | `/api/v1/auth/register` | None               | Email/password registration                                               |
| `POST`  | `/api/v1/auth/login`    | None               | Email/password login                                                      |
| `POST`  | `/api/v1/auth/google`   | None               | Google ID-token login or account creation                                 |
| `POST`  | `/api/v1/auth/refresh`  | Refresh credential | Rotate the refresh session and issue new tokens                           |
| `POST`  | `/api/v1/auth/logout`   | Refresh credential | Revoke the current refresh session                                        |
| `GET`   | `/api/v1/users/me`      | Access token       | Return the caller's safe profile                                          |
| `PATCH` | `/api/v1/users/me`      | Access token       | Update explicitly permitted profile fields                                |

### Response conventions

- Use correct HTTP status codes and one error envelope across all modules.
- Every error contains a stable application error code, a safe message, and the request ID. Validation errors may include field-level details.
- Never expose stack traces, SQL messages, configuration, token values, password hashes, or provider internals.
- Do not wrap successful responses in multiple inconsistent shapes. Choose one convention during Phase A and document it in Swagger.
- Swagger must describe only behavior that exists.

## 8. Configuration

Validate configuration before NestJS starts listening. At minimum, define:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
DATABASE_POOL_MAX=10
CORS_ORIGINS=http://localhost:3000
JWT_ISSUER=arogio-api
JWT_AUDIENCE=arogio-clients
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
GOOGLE_CLIENT_IDS=comma-separated-client-ids
LOG_LEVEL=info
SWAGGER_ENABLED=true
```

Provide `.env.example` with non-secret examples. Never commit `.env`, production credentials, real tokens, or database dumps. Production Swagger exposure should be explicitly configurable.

Connection pool sizing must account for the total across all deployed instances and remain below the provider's connection limit. The application must close the pool during graceful shutdown.

## 9. Security and privacy baseline

- Explicit CORS allowlist; never wildcard origins with credentials.
- Appropriate HTTP security headers.
- Conservative JSON body-size limit.
- Global input validation with unknown fields rejected or stripped consistently.
- Rate limits on register, login, Google, and refresh endpoints; stricter limits may be applied by IP and normalized account identifier.
- Constant-shape public authentication failures and no secret-bearing logs.
- HTTPS required outside local development.
- Least-data profile responses and explicit update allowlists.
- Structured-log redaction for authorization, cookie, password, token, and future OTP fields.
- Dependency audit results recorded during hand-off; findings assessed rather than blindly auto-fixed.
- No real patient data in this phase. Before introducing it, perform a separate privacy, access-control, audit, retention, backup, and Indian regulatory review.

## 10. Testing strategy

### Unit tests

- Registration normalization, hashing boundary, duplicate handling, and safe output.
- Login success, missing user, wrong password, and disabled user.
- Google existing identity, new identity, invalid token, wrong audience, missing claims, and duplicate/concurrent creation handling.
- Refresh rotation, expiry, revocation, and reuse detection.
- Profile field allowlist and sensitive-field exclusion.

### API/integration tests

- Liveness success and readiness success/failure.
- Malformed and unknown payload fields.
- Registration, login, Google, refresh, logout, and `/users/me` authorization behavior.
- Consistent error envelope and request ID propagation.
- Responses never include `password_hash`, refresh hashes, provider tokens, or internal errors.

### Database verification

- Apply all migrations to an empty PostgreSQL test database.
- Verify unique email and provider-subject constraints, foreign keys, and cascade behavior.
- Verify concurrent account creation cannot create duplicate identities.

Google tests use a fake verifier. Database tests use an isolated disposable database or documented test schema, never a shared production database.

Required verification commands must be exposed as package scripts and reported honestly:

```bash
npm run format:check
npm run lint
npm run build
npm run test
npm run test:e2e
npm run db:generate
npm run db:migrate
```

If an external database or credential prevents a check, document the exact unrun command and blocker. Never report an unrun check as passing.

## 11. Implementation phases

Complete phases in order. At the end of each phase, record changed files, commands run, results, and unresolved blockers before continuing.

### Phase A — Bootstrap and stabilize

1. Create the NestJS TypeScript scaffold in this repository without overwriting unrelated user work.
2. Establish scripts, formatting, linting, strict TypeScript, and test configuration.
3. Add validated environment configuration and `.env.example`.
4. Configure API prefix, shutdown hooks, body limit, CORS, and security headers.
5. Confirm clean install, lint, tests, and build.

Exit criteria: the empty application starts with valid configuration, fails clearly with invalid required configuration, and all available checks pass.

### Phase B — Database foundation

1. Configure the PostgreSQL driver, Drizzle ORM, Drizzle Kit, pool limits, and graceful shutdown.
2. Add `users`, `auth_identities`, and `auth_sessions` schemas.
3. Generate and commit the initial SQL migration.
4. Apply migrations to an empty test database and verify constraints.
5. Document local/Supabase connection and migration workflows.

Exit criteria: a fresh database reaches the expected schema using committed migrations only, and lifecycle/constraint tests pass.

### Phase C — API foundation

1. Add `/health` and `/ready` with distinct semantics.
2. Add request IDs, structured/redacted logging, validation, and the global exception filter.
3. Add rate limiting and the security baseline.
4. Add Swagger generated from implemented code.
5. Add API tests.

Exit criteria: infrastructure behavior is consistent, documented, and tested without leaking dependency details.

### Phase D — Authentication and users

1. Implement email/password registration and login.
2. Implement access JWTs and rotating refresh sessions.
3. Implement backend Google ID-token verification and transactional account creation.
4. Implement refresh and logout.
5. Implement `GET` and `PATCH /users/me` with safe response models.
6. Add the auth and account concurrency/security tests.
7. Document the future mobile OTP boundary; do not expose a fake production flow.

Exit criteria: every claimed authentication flow works through the public API, is covered by tests, and never exposes credentials or sensitive persistence fields.

### Phase E — Verification and hand-off

1. Run formatting, lint, build, unit, integration/e2e, and clean migration verification.
2. Update the README with prerequisites, configuration, database setup, migrations, local run, test, API docs, and deployment notes.
3. Review dependency vulnerabilities and committed files for secrets.
4. Produce a completion report listing commands and their actual results, blockers, and production gaps.
5. Stop before any hospital or doctor work.

## 12. Definition of done

This foundation is complete only when:

- A new developer can configure, migrate, run, and test the backend from the README.
- Startup rejects invalid required configuration.
- The application builds and starts with valid configuration.
- Health and readiness endpoints have the documented behavior.
- A clean PostgreSQL database can be created solely from committed Drizzle migrations.
- Email/password and Google authentication are verified by automated tests.
- Google tokens are verified by the backend and are not used as Arogio sessions.
- Refresh rotation, logout/revocation, expiry, and reuse handling are tested.
- Swagger matches the actual API.
- Secrets and sensitive database fields are neither committed, logged, nor returned.
- All executed checks and any unexecuted checks are reported accurately.
- No hospital, doctor, or other deferred domain module, endpoint, or table exists.
- The README clearly separates implemented behavior from production follow-up work.

## 13. Deferred decisions and production gates

These items do not block starting the foundation, but must be resolved before their affected feature is released:

- Final production database/hosting provider and region.
- Exact web refresh-token transport and cross-origin deployment topology.
- JWT signing-key rotation approach; consider asymmetric signing when multiple services need offline verification.
- Transactional email provider and verified email/password-reset flows.
- SMS provider, OTP persistence, abuse controls, and cost limits.
- Secure, user-authorized account linking across password, Google, and future phone identities.
- Backup, restore testing, monitoring, alerting, incident response, and key rotation.
- Privacy and regulatory controls before storing any real health information.

## 14. Working rules for implementation

- Inspect callers, tests, configuration, and migrations before changing shared behavior.
- Make small, reviewable changes and reuse established project patterns.
- Keep controllers thin and avoid speculative abstraction.
- Preserve validation, security, and error handling even when seeking a smaller implementation.
- Never modify production tables manually or use destructive automatic schema synchronization.
- Ask for a product decision only when it materially blocks safe implementation; otherwise use this plan and document reasonable assumptions.
- End every phase with evidence: changed files, commands, test results, and remaining risks.
