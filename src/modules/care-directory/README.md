# Care directory

Hospitals, doctors, labs, pharmacies, medicine information, affiliations and correction requests.

Entry point: [care-directory.module.ts](care-directory.module.ts).

## Controllers

- [care-directory.controller.ts](controllers/care-directory.controller.ts)

## Requests

- [care-directory.input.ts](requests/care-directory.input.ts)

## Services

- [care-directory.service.ts](services/care-directory.service.ts)

## Database tables

- `care_directory_entries` ? [care-directory-entries.schema.ts](../../../src/database/schema/care-directory-entries.schema.ts)
- `care_provider_affiliations` ? [care-provider-affiliations.schema.ts](../../../src/database/schema/care-provider-affiliations.schema.ts)
- `care_directory_corrections` ? [care-directory-corrections.schema.ts](../../../src/database/schema/care-directory-corrections.schema.ts)
- `blood_bank_corrections` ? [blood-bank-corrections.schema.ts](../../../src/database/schema/blood-bank-corrections.schema.ts)

[All modules](../README.md) ? [Table catalog](../../../database/TABLES.md)

Structured [Doctors](../doctors/README.md) and [Hospitals](../hospitals/README.md) own their profiles and update these care rows as compatibility projections with the same UUID. Manage structured doctors through Doctors administration; generic care editing, review and affiliation replacement are blocked for them. Public doctor/hospital discovery supports recorded cities; other legacy kinds keep their existing coverage rules.
