# Deploy and verify the backend

The Android APK calls `https://backend.arogio.com/api/v1`. The domain must route to the compiled Nest application, including the `/api/v1` prefix. The status homepage is served by that same application at `/`; uploading the HTML alone cannot show requests received by Nest.

## Build and start

### Deploy through Git (shared hosting)

The compiled `dist/` folder is included in Git so the shared host does not need the Nest CLI or a build step. Private `.env` files, `node_modules/` and TypeScript build caches remain ignored.

After changing backend source, build locally, commit the updated source **and `dist/`**, then push your deployment branch. The current working branch is `project-setup-branch`; make sure the hosting repository checks out that same branch.

```powershell
npm.cmd run build
git add dist .gitignore DEPLOYMENT.md SHARED_HOSTING.md
# Include any source/config/migration changes in the same commit.
git commit -m "Include compiled backend for shared-hosting deployment"
git push
```

In the hosting Git manager, pull/deploy the latest commit into the Node application's root. If using its terminal, run `git pull --ff-only` in that repository. Then install Linux runtime dependencies with `npm ci --omit=dev` (or use the panel's **Run NPM Install**) and restart the Node app with startup file `app.js`. No manual file upload or server-side `npm run build` is needed. Apply new reviewed database migrations as described below before restarting a release that requires them.

This makes compiled files available through Git; it does not configure automatic GitHub-to-host deployment. If the host's Git checkout and Node application root differ, its deployment task must copy the checkout into the configured application root. Confirm these paths in the hosting panel rather than guessing a deployment destination.

### Rebuild locally when needed

From the backend project root, install build dependencies and compile:

```sh
npm ci
npm run build
```

The deployment must contain `app.js`, `dist/` (including `dist/modules/status/public/`), `database/migrations/`, `package.json`, the lockfile and runtime dependencies. Configure production environment variables using the hosting panel or secret manager. Required configuration includes `NODE_ENV=production`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `GOOGLE_CLIENT_IDS` and `CORS_ORIGINS`. Use the Google **Web** client ID as the accepted token audience. Keep credentials out of the public web directory. Respect the `PORT` supplied by the host.

Apply committed database migrations against the intended production database after reviewing/backing up the deployment:

```sh
npm run db:migrate:production
```

Run `npm run db:diagnose` from the deployed application root before and after migrating. It checks the compiled backend, the migration ledger, and the actual columns for the medical catalogs, blood banks, and other directories affected by `0032_remove_directory_sources`. If `releaseSchemaMismatch` contains entries, deploy compiled files built from the matching source revision. If `0032` appears under `pending`, apply the migrations with the matching release. If the diagnostic reports `missingFromHistory`, `hashMismatch`, or missing columns despite an applied migration, investigate the release and database history before retrying.

### cPanel without a terminal

Deploy the matching `package.json`, `dist/`, and `database/migrations/` to the Node application's root. In **Setup Node.js App → Edit → Run JS Script**, select `db:diagnose` with no arguments. If it reports pending migrations, run `db:migrate:production` after taking a database backup, then rerun `db:diagnose`. Once the diagnostic passes, restart the application and check the public catalogs.

To load the starter Yoga and Meditation content, select `seed:wellness:production` with no arguments. It uses the app's production database connection and inserts drafts. Review and publish the entries in **Admin → Meditation** to make them visible on mobile.

Start the compiled application with `npm start` (which runs `node dist/main.js`). For this project's shared-hosting configuration, use the existing **`app.js` startup file**, which sets the working directory and starts `dist/main.js`; set the application root to the backend directory containing `package.json` and `app.js`. See [SHARED_HOSTING.md](./SHARED_HOSTING.md). Restart the Node application after uploading/building; confirm its startup log has no missing environment variables, dependencies or assets. Production configuration checks `.env.production` and then `.env`; hosting environment variables can also supply the configuration.

For cPanel/Passenger-style hosting, confirm the application URL is the **root of `backend.arogio.com`**, not an unintended subpath or a static document root. Replace the host's sample startup-file setting with this project's `app.js`; do not delete unrelated files. If the hosting service does not support a persistent Node HTTP application, it must proxy this domain to a supported Node service instead. Host-specific routing changes require access to that hosting configuration.

## Verify before using the APK

1. Open `https://backend.arogio.com/`. It should show **Arogio backend status**. A hosting 404 means the domain is still not reaching this application.
2. Open `/api/v1/health`. Expect HTTP 200, JSON with `status: "ok"`, and response header `x-arogio-service: arogio-health-api`.
3. Open `/api/v1/ready`. Expect HTTP 200 with `status: "ready"` and `checks.database: "up"`. HTTP 503 means the API is running but its database is unavailable. A readiness pass checks connectivity, not migration completeness; run the smoke/account checks too.
4. On the homepage, click **Run connection checks**. All three checks should pass. Include diagnostic probes to see those calls in the feed.
5. Try signup/login in the APK while watching the feed. The corresponding `/api/v1/auth/...` row confirms delivery to Nest. A 4xx/5xx row means delivery succeeded but the API rejected/failed the request; inspect server logs and the response error, using its `x-request-id` for correlation.

Run the existing deployment smoke checks from a trusted machine:

```sh
node scripts/verification/smoke-api.mjs https://backend.arogio.com/api/v1
```

These exercise health, readiness, authentication validation, and the first page of Care Directory, hospitals, doctors, medical departments, diseases, articles, blood banks, Yoga, and Meditation. The catalog checks expose schema failures even when readiness passes. The script does not create accounts or alter data. Requests appear in the monitor with their request IDs.

On 2026-10-26, direct checks returned hosting **HTML 404** responses for `/`, `/api/v1/health` and `/api/v1/ready`. Earlier checks returned a plain-text Node welcome page. Neither response satisfies the API contract; an APK rebuild cannot repair this server-side routing/startup problem.

## Local verification without production data

```sh
npm run build
npm run start:local:validation
```

Open `http://127.0.0.1:3001/`. This runner uses a disposable in-memory database and real application providers. In another terminal, run:

```sh
node --experimental-strip-types scripts/verification/test-local-app-client.mjs http://127.0.0.1:3001/api/v1
```

It exercises the app's actual HTTP client for signup, saved setup, review edits, completion, login, refresh and logout. Local validation does not prove the hosted deployment or a real Google account authorization works.
