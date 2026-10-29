# Profile setup API

Apply the new migration before deploying this API with the updated app:

```powershell
npm.cmd run db:migrate
npm.cmd run build
```

Migration `drizzle/0004_handy_captain_universe.sql` adds nullable `users.profile_setup` JSONB and `users.profile_completed_at`. Existing users remain incomplete until they finish setup. No existing data is backfilled or discarded.

Authenticated `GET /api/v1/users/me` and authentication responses now include `profileSetup` and `profileCompletedAt`.

Authenticated `PATCH /api/v1/users/me/setup` merges the supplied draft with saved progress and returns the safe current-user profile. The account ID comes from the bearer token; clients cannot choose another user's profile or set completion timestamps directly.

Example final submission:

```json
{
  "dateOfBirth": "2001-03-17",
  "weightValue": 70,
  "weightUnit": "kg",
  "heightValue": 170,
  "heightUnit": "cm",
  "activityLevel": "lightly_active",
  "healthGoals": ["weight_management", "fitness_activity"],
  "gender": "female",
  "location": "Mumbai",
  "referralSource": "Friend",
  "healthReminders": true,
  "tipsAndInsights": true,
  "productUpdates": false,
  "step": 7,
  "complete": true
}
```

All fields are optional for draft saves. Measurements require both value and unit. Supported units: height `cm`/`in`, weight `kg`/`lb`. Date of birth must be a real date from 1900 through today. Completion additionally requires birth date, valid height and weight, activity level and at least one goal. Completion is idempotent and preserves its first timestamp.

Activity levels: `sedentary`, `lightly_active`, `moderately_active`, `very_active`.
Goals: `weight_management`, `fitness_activity`, `better_eating`, `improve_sleep`, `manage_stress`.
Gender: `female`, `male`, `other`, `prefer_not_to_say`.
Step is the next displayed zero-based screen, 0 through 7. Preference booleans store consent choices; this endpoint does not send notifications.

Validation errors use the existing `VALIDATION_FAILED` response. Authentication is required. Request validation rejects unknown properties, invalid enums, duplicate goals and null setup fields.

Verified locally with migrations and repository/service operations against disposable PGlite, plus authenticated HTTP route tests. Deployment and migration against the configured hosted database have not been performed.
