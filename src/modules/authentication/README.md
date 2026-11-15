# Authentication

Email/password and Google sign-in, access tokens, refresh sessions and password hashing.

Entry point: [authentication.module.ts](authentication.module.ts).

## Controllers

- [authentication.controller.ts](controllers/authentication.controller.ts)

## Requests

- [authentication.dto.ts](requests/authentication.dto.ts)

## Responses

- [authentication-response.dto.ts](responses/authentication-response.dto.ts)

## Services

- [authentication.service.spec.ts](services/authentication.service.spec.ts)
- [authentication.service.ts](services/authentication.service.ts)
- [password-hashing.service.spec.ts](services/password-hashing.service.spec.ts)
- [password-hashing.service.ts](services/password-hashing.service.ts)

## Repositories

- [authentication.repository.ts](repositories/authentication.repository.ts)

## Strategies

- [jwt.strategy.ts](strategies/jwt.strategy.ts)

## Database tables

- `authentication_identities` ? [authentication-identities.schema.ts](../../../src/database/schema/authentication-identities.schema.ts)
- `authentication_sessions` ? [authentication-sessions.schema.ts](../../../src/database/schema/authentication-sessions.schema.ts)
- `user_accounts` ? [user-accounts.schema.ts](../../../src/database/schema/user-accounts.schema.ts)

[All modules](../README.md) ? [Table catalog](../../../database/TABLES.md)
