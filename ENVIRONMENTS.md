# Environment setup

Local development: `npm.cmd run start:local` (or `start:dev`) builds the backend
and starts the real API at `http://localhost:3001/api/v1` using persistent embedded
PostgreSQL in `.local/database`. It loads private `.env.local`, uses a separate
local JWT secret and never opens the hosted database. Rerun after backend code
changes. `start:local:validation` remains disposable in-memory QA mode.

Production: the shared-hosting startup file remains `app.js`, which defaults
to `NODE_ENV=production`. Nest loads `.env.production`; hosting-manager variables
take precedence. `npm start`, `db:diagnose` and `db:migrate:production` also load
the optional production file. Use Node 22 or newer. Existing production database
credentials and JWT secret were preserved; no migration was run for this setup.

`GOOGLE_CLIENT_IDS` uses the Google Web client:
`987857172312-fil8ani3esi0j9gsg095c6tg1utcbm2j.apps.googleusercontent.com`.

Keep private env files and `.local` out of Git. Use the committed
`.env.local.example` / `.env.production.example` templates for other machines;
do not replace production secrets with template placeholders. Deploy the updated
compiled code and restart the host; private env files are not pushed.

Full app/API commands, endpoint values and the outstanding Google Cloud release
certificate registration are documented in `D:/arogio-health-app/docs/environments.md`.
