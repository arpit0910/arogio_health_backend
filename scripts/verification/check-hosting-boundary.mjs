// Read-only checks for the public web-server boundary, not a load/security scan.
const origin = new URL(process.argv[2] ?? 'https://backend.arogio.com').origin;
const checks = [
  { path: '/dist/main.js', method: 'HEAD', statuses: [403, 404] },
  { path: '/.env', method: 'HEAD', statuses: [403, 404] },
  { path: '/.env.production', method: 'HEAD', statuses: [403, 404] },
  { path: '/api/v1/health', statuses: [200], status: 'ok' },
  { path: '/api/v1/ready', statuses: [200], status: 'ready' },
  // The application's admin document middleware intentionally handles GET only.
  { path: '/admin', statuses: [200] },
  { path: '/admin-assets/care.js', method: 'HEAD', statuses: [200] },
  { path: '/admin-assets/bank-review.js', method: 'HEAD', statuses: [200] },
];

for (const check of checks) {
  try {
    const response = await fetch(origin + check.path, {
      method: check.method ?? 'GET',
      redirect: 'manual',
      headers: { 'x-arogio-diagnostic': 'smoke-test' },
      signal: AbortSignal.timeout(15000),
    });
    let pass = check.statuses.includes(response.status);
    if (check.status) {
      const body = await response.json();
      pass &&= body.status === check.status;
    }
    console.log(JSON.stringify({ path: check.path, expected: check.statuses, actual: response.status, pass }));
    if (!pass) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ path: check.path, pass: false, error: error.message }));
    process.exitCode = 1;
  }
}
