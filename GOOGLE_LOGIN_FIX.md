# Confirmed mobile Google-login audience mismatch

On 28 October 2026, the user confirmed the hosted GOOGLE_CLIENT_IDS value is:

```
987857172312-2lpo2lomjmfde8r0kr4k9doeqnkfeb17.apps.googleusercontent.com
```

That is the Android OAuth client. The native app configures Google Sign-In with the shared Web client, so the server must accept:

```
GOOGLE_CLIENT_IDS=987857172312-fil8ani3esi0j9gsg095c6tg1utcbm2j.apps.googleusercontent.com
```

Set this value in the hosting Node application environment and restart the Node application. Panel variables override .env.production and .env; updating a local file alone cannot fix the running server. Preserve all database/JWT credentials. No client secret is required. Keep the Android OAuth registration in Google Cloud: it still identifies the app package and signing certificate, but is not the ID-token audience. No APK rebuild is required for this server-only correction.

After restart, attempt Google login again and check the new POST /api/v1/auth/google/login entry. A matching email/password account may require an authenticated account-link flow (ACCOUNT_LINK_REQUIRED); token verification must not be weakened to bypass that protection.

The code now distinguishes an audience mismatch, expired token, future-issued token and certificate-fetch failure using fixed safe diagnostics. Raw Google exceptions may contain JWTs or claims, so they are never forwarded or logged. Malformed audience environment values fail startup. Signature, issuer, expiry and audience checks still run through google-auth-library.

The public request monitor had a single old Google-login rejection at 9:19:43 PM IST when inspected; that entry alone was not evidence of a new phone attempt. The hosted environment value supplied by the user establishes the concrete configuration mismatch. The hosting panel was not changed from this workspace and no successful real Google-account sign-in has been verified here.
