# Production server-file exposure - 11 November 2026

Confirmed: GET https://backend.arogio.com/dist/main.js returns HTTP 200,
Content-Type text/javascript, 702 bytes identical to local dist/main.js.
This is server implementation code, not an HTML fallback. HEAD requests to
/.env and /.env.production returned 403; no environment-file body was fetched.
No claim is made that every possible sensitive file has been checked.

The app API itself works. Blocking this only in Nest middleware is insufficient:
the hosting web server can serve physical files before Passenger receives them.

## Preferred correction

Separate the Node application root from the public document root. Keep the
repository, environment files, dependencies, compiled server and SQL migrations
outside the public directory; route the domain to Passenger. Confirm the actual
host's supported document-root/application-root arrangement before moving files.

## Scoped correction for the existing shared-root arrangement

1. Back up the existing hosting-generated .htaccess.
2. Merge the rules in ../hosting/apache-private-files.htaccess into that file,
   before any existing catch-all rewrite. Preserve every existing Passenger,
   runtime, TLS and domain directive. Do not replace the file with this fragment.
3. The host must support Apache-compatible mod_rewrite and permit these rules.
   Confirm this with the hosting panel/provider. This fragment has not been
   installed or Apache-syntax-tested on the production host.
4. Request /dist/main.js again: expect 403 or 404, never source code.
5. Recheck /api/v1/health, /api/v1/ready, /admin, /admin-assets/care.js,
   /status-assets and the APK. Functional routes/assets must still work.
6. Purge any edge cache for previously public server-file URLs if applicable.
   If routing breaks, restore only the backed-up configuration and have the
   provider correct the application/document-root mapping.

Run the read-only acceptance check after applying the change:

```sh
node scripts/check-hosting-boundary.mjs https://backend.arogio.com
```

All eight checks must pass: private files denied, API and public admin assets
still available. Before the fix, this command correctly fails /dist/main.js.

No hosting configuration was changed during testing. This requires hosting-owner
application and a live retest before the exposure finding can be closed.

Reference: https://httpd.apache.org/docs/2.4/rewrite/flags.html#flag_f
The F flag denies matching requests with HTTP 403.
