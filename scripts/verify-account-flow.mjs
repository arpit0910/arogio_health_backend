import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpClient, ApiError } from '../../arogio-health-app/src/services/api/httpClient.ts';
import { authResponseSchema, safeUserSchema, tokenPairSchema } from '../../arogio-health-app/src/features/auth/types.ts';

// Only generated test-account credentials are used. Never print tokens/passwords.
export async function verifyAccountFlow(baseUrl, { legacy = false } = {}) {
  let accessToken = null;
  const client = new HttpClient(baseUrl, async () => accessToken);
  const sessions = new Set();
  const paths = legacy ? { register: '/auth/register', login: '/auth/login', google: '/auth/google', refresh: '/auth/refresh', setup: '/users/me/setup' }
    : { register: '/auth/email/register', login: '/auth/email/login', google: '/auth/google/login', refresh: '/auth/tokens/refresh', setup: '/users/me/profile-setup' };
  const request = options => client.request({ ...options, headers: { 'x-arogio-diagnostic': 'smoke-test' } });
  const credentials = { email: `flow-check-${randomUUID()}@example.invalid`, password: `FlowTest123-${randomUUID()}` };
  const pass = check => console.log(JSON.stringify({ check, pass: true }));
  const authenticate = async path => {
    const result = authResponseSchema.parse(await request({ path, method: 'POST', body: credentials }));
    accessToken = result.accessToken;
    sessions.add(result.refreshToken);
    return result;
  };
  try {
    const registered = await authenticate(paths.register);
    assert.equal(registered.user.profileCompletedAt, null);
    pass('signup through app transport');
    await request({ path: paths.setup, method: 'PATCH', body: { dateOfBirth: '2001-03-17', heightValue: 170, heightUnit: 'cm', weightValue: 70, weightUnit: 'kg', step: 2 } });
    const resumed = await authenticate(paths.login);
    assert.equal(resumed.user.profileSetup.step, 2);
    pass('login resumes saved setup');
    for (const body of [
      { activityLevel: 'lightly_active', step: 3 },
      { healthGoals: ['weight_management', 'fitness_activity'], step: 4 },
      { gender: 'female', location: 'Test city', referralSource: 'Integration test', step: 5 },
      { healthReminders: true, tipsAndInsights: true, productUpdates: false, step: 6 },
      { weightValue: 72, weightUnit: 'kg', step: 6 },
      { complete: true, step: 7 },
    ]) await request({ path: paths.setup, method: 'PATCH', body });
    const profile = safeUserSchema.parse(await request({ path: '/users/me' }));
    assert.ok(profile.profileCompletedAt);
    assert.equal(profile.weightValue, 72);
    pass('setup steps, review edit, completion and profile retrieval');
    const signedIn = await authenticate(paths.login);
    assert.equal(signedIn.user.profileCompletedAt, profile.profileCompletedAt);
    const refreshed = tokenPairSchema.parse(await request({ path: paths.refresh, method: 'POST', body: { refreshToken: signedIn.refreshToken } }));
    sessions.add(refreshed.refreshToken);
    accessToken = refreshed.accessToken;
    safeUserSchema.parse(await request({ path: '/users/me' }));
    await request({ path: '/auth/logout', method: 'POST', body: { refreshToken: refreshed.refreshToken } });
    await assert.rejects(request({ path: paths.refresh, method: 'POST', body: { refreshToken: refreshed.refreshToken } }), error => error instanceof ApiError && error.status === 401);
    pass('completed-profile login, token refresh, logout and revoked-token rejection');
    await assert.rejects(request({ path: paths.google, method: 'POST', body: { idToken: 'invalid-integration-test-token' } }), error => error instanceof ApiError && error.status === 401 && error.code === 'INVALID_GOOGLE_TOKEN');
    pass('invalid Google token rejected');
  } finally {
    let cleanupFailed = false;
    for (const refreshToken of sessions) {
      try { await request({ path: '/auth/logout', method: 'POST', body: { refreshToken } }); }
      catch { cleanupFailed = true; }
    }
    if (cleanupFailed) throw new Error('One or more generated test sessions could not be revoked.');
  }
  console.log('Generated test account remains in this database; all issued test sessions were revoked. Real Google authorization still needs a device test.');
}
