# Personal wellness

Water intake, menstrual tracking, medicine schedules and doses, activity targets and data export.

Entry point: [personal-wellness.module.ts](personal-wellness.module.ts).

## Controllers

- [export.controller.ts](controllers/export.controller.ts)
- [personal-wellness.controller.ts](controllers/personal-wellness.controller.ts)

## Requests

- [personal-wellness.input.ts](requests/personal-wellness.input.ts)

## Services

- [personal-wellness.service.ts](services/personal-wellness.service.ts)

## Domain

- [personal-wellness.domain.ts](domain/personal-wellness.domain.ts)

## Database tables

- `personal_wellness_settings` ? [personal-wellness-settings.schema.ts](../../../src/database/schema/personal-wellness-settings.schema.ts)
- `water_intake_logs` ? [water-intake-logs.schema.ts](../../../src/database/schema/water-intake-logs.schema.ts)
- `water_reminder_states` ? [water-reminder-states.schema.ts](../../../src/database/schema/water-reminder-states.schema.ts)
- `medicine_dose_logs` ? [medicine-dose-logs.schema.ts](../../../src/database/schema/medicine-dose-logs.schema.ts)
- `menstrual_periods` ? [menstrual-periods.schema.ts](../../../src/database/schema/menstrual-periods.schema.ts)
- `menstrual_daily_logs` ? [menstrual-daily-logs.schema.ts](../../../src/database/schema/menstrual-daily-logs.schema.ts)

[All modules](../README.md) ? [Table catalog](../../../database/TABLES.md)
