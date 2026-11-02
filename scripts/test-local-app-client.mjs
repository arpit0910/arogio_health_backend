import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpClient, ApiError } from '../../arogio-health-app/src/services/api/httpClient.ts';
import { authResponseSchema, safeUserSchema, tokenPairSchema } from '../../arogio-health-app/src/features/auth/types.ts';

// Uses the app's actual transport and schemas against the disposable local API.
// Never run this account-creating check against a hosted endpoint.
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3001/api/v1';
const url = new URL(baseUrl);
if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
  throw new Error('This check is restricted to a loopback validation API.');
}
let accessToken = null;
const client = new HttpClient(baseUrl, async () => accessToken);
const credentials = { email: `local-${randomUUID()}@example.invalid`, password: `LocalTest123-${randomUUID()}` };
const pass = name => console.log(JSON.stringify({ check: name, pass: true }));

const registered = authResponseSchema.parse(await client.request({ path: '/auth/register', method: 'POST', body: credentials }));
accessToken = registered.accessToken;
assert.equal(registered.user.profileCompletedAt, null);
pass('app client signup and response parsing');
await client.request({ path: '/users/me/setup', method: 'PATCH', body: { dateOfBirth: '2001-03-17', heightValue: 170, heightUnit: 'cm', weightValue: 70, weightUnit: 'kg', step: 2 } });
const resumed = authResponseSchema.parse(await client.request({ path: '/auth/login', method: 'POST', body: credentials }));
accessToken = resumed.accessToken;
assert.equal(resumed.user.profileSetup.step, 2);
pass('login resumes saved profile');
for (const body of [
  { activityLevel: 'lightly_active', step: 3 },
  { healthGoals: ['weight_management', 'fitness_activity'], step: 4 },
  { gender: 'female', location: 'Local test city', referralSource: 'Testing', step: 5 },
  { healthReminders: true, tipsAndInsights: true, productUpdates: false, step: 6 },
  { weightValue: 72, weightUnit: 'kg', step: 6 },
  { complete: true, step: 7 },
]) await client.request({ path: '/users/me/setup', method: 'PATCH', body });
const profile = safeUserSchema.parse(await client.request({ path: '/users/me' }));
assert.ok(profile.profileCompletedAt);
assert.equal(profile.profileSetup.dateOfBirth, '2001-03-17');
assert.equal(profile.profileSetup.activityLevel, 'lightly_active');
assert.equal(profile.weightValue, 72);
pass('all setup steps, review edit and completion');
const signedIn = authResponseSchema.parse(await client.request({ path: '/auth/login', method: 'POST', body: credentials }));
assert.equal(signedIn.user.profileCompletedAt, profile.profileCompletedAt);
const refreshed = tokenPairSchema.parse(await client.request({ path: '/auth/refresh', method: 'POST', body: { refreshToken: signedIn.refreshToken } }));
accessToken = refreshed.accessToken;
safeUserSchema.parse(await client.request({ path: '/users/me' }));
await client.request({ path: '/auth/logout', method: 'POST', body: { refreshToken: refreshed.refreshToken } });
await assert.rejects(client.request({ path: '/auth/refresh', method: 'POST', body: { refreshToken: refreshed.refreshToken } }), error => error instanceof ApiError && error.status === 401);
pass('completed-profile login, refresh and logout');
await assert.rejects(client.request({ path: '/auth/google', method: 'POST', body: { idToken: 'invalid-local-google-test-token' } }), error => error instanceof ApiError && error.status === 401 && error.code === 'INVALID_GOOGLE_TOKEN');
pass('real Google verifier rejects invalid tokens through app transport');
console.log('Real Google account authorization still requires a signed-in Android device.');
