// Read-only deployment checks. This script never creates an account or saves data.
const baseUrl = (process.argv[2] ?? 'https://backend.arogio.com/api/v1').replace(/\/$/, '');
const checks = [
  { path: '/health', status: 200, field: 'status', value: 'ok' },
  { path: '/ready', status: 200, field: 'status', value: 'ready' },
  { path: '/users/me', status: 401 },
  { path: '/auth/login', method: 'POST', body: {}, status: 400 },
  { path: '/auth/google', method: 'POST', body: { idToken: 'invalid-deployment-smoke-test-token' }, status: 401 },
  { path: '/users/me/setup', method: 'PATCH', body: { step: 1 }, status: 401 },
];

for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      method: check.method ?? 'GET',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-arogio-diagnostic': 'smoke-test' },
      ...(check.body ? { body: JSON.stringify(check.body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const json = response.headers.get('content-type')?.includes('application/json');
    const body = json ? await response.json() : null;
    const pass = response.status === check.status && json &&
      (!check.field || body?.[check.field] === check.value) &&
      (check.status < 400 || typeof body?.error?.code === 'string');
    console.log(JSON.stringify({ path: check.path, expected: check.status, actual: response.status, json: Boolean(json), code: body?.error?.code, requestId: response.headers.get('x-request-id'), pass: Boolean(pass) }));
    if (!pass) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ path: check.path, pass: false, error: error.message }));
    process.exitCode = 1;
  }
}
