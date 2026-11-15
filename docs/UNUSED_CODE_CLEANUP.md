# Unused code cleanup

Removed `src/infrastructure/sms/sms-provider.interface.ts`: it had no imports, implementation, dependency-injection registration or OTP endpoint. Updated the setup/authentication guide to describe SMS as unimplemented rather than pointing to this placeholder.

All feature modules are registered in `src/app.module.ts`; no module or API endpoint was removed. Backend endpoints also serve admin tooling and external clients, so absence of a mobile caller alone is not evidence that an endpoint is unused. PostgreSQL migrations, snapshots, seeds, data imports and operational scripts remain. NestJS framework/runtime dependencies remain, including RxJS even though application source has no direct RxJS import.

The frontend cleanup is recorded in its own `docs/UNUSED_CODE_CLEANUP.md`. No production deployment, schema change or user-data deletion was performed.
