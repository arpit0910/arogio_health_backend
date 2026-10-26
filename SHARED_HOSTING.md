# Shared-hosting deployment

The public domain currently returns the hosting provider's Node sample page. Uploading source alone does not switch the running application to Nest.

## Node application settings

In your hosting panel's Node application manager:

- Application root: the directory containing this project's package.json and app.js.
- Application URL: https://backend.arogio.com/ (the domain root, not /api/v1).
- Startup file: app.js.
- Node version: 22 LTS or another version satisfying package.json engines.
- Mode / NODE_ENV: production.

app.js starts dist/main.js after setting the working directory to the application root. Passenger handles external port routing; do not expose port 3000 in the APK.

## Build and configure

1. Pull/deploy the backend Git repository into the configured Node application root. The compiled `dist` folder, including the status homepage assets, is now included in Git. Use the same branch as the pushed changes (currently `project-setup-branch`). Do not transfer Windows node_modules. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Git workflow.
2. Run `npm ci --omit=dev` in the application's Linux terminal/environment, or use the panel's **Run NPM Install**, then restart the Node app. A server-side build is not required when using the committed `dist` files. For future code changes, build locally and commit both source and compiled output before pushing. Stop local validation/dev servers before a local `npm ci`, because Windows locks loaded native Argon2 files.
3. Set the required variables using the hosting panel or a private .env file in the application root. Existing .env.production is not automatically loaded by Nest's default configuration. Never place environment files in a public document directory.
4. Configure DATABASE_URL, JWT_ACCESS_SECRET (at least 32 characters), CORS_ORIGINS, NODE_ENV=production and GOOGLE_CLIENT_IDS. Preserve production database and signing secrets; do not replace them with example values.
5. GOOGLE_CLIENT_IDS must include 987857172312-fil8ani3esi0j9gsg095c6tg1utcbm2j.apps.googleusercontent.com. Multiple accepted audiences use commas. No Google client secret is needed for ID-token verification.
6. Apply reviewed migrations with npm run db:migrate:production using the intended production database (compiled dist is included in the release package). Take the normal database backup first.
7. Restart the Node application in the panel. Verify the startup file and application root if the sample page remains.

## Verify after restart

- GET https://backend.arogio.com/api/v1/health must return JSON health status.
- GET https://backend.arogio.com/api/v1/ready must report database readiness.
- POST https://backend.arogio.com/api/v1/auth/login with JSON {} must return a JSON validation error (HTTP 400), never the sample page or an HTML response.
- Test registration and login using a dedicated test account, then Google sign-in on the release APK.

If startup fails, inspect the Node application error log for missing dist/main.js, environment validation, database connectivity or native dependency errors. Redact tokens/passwords before sharing logs.

Google Cloud also needs an Android OAuth client in the same project for package com.arogio.health and release SHA-1 CD:D6:E8:F9:74:AB:F3:E8:1E:65:32:D0:4C:AD:3E:96:6D:BF:EB:B6. The new Web client ID does not replace that Android registration.

References: https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/ and https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/reverse_port_binding.html
