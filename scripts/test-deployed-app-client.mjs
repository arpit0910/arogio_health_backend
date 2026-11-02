import { verifyAccountFlow } from './verify-account-flow.mjs';
if (!process.argv.includes('--create-test-account')) {
  throw new Error('Pass --create-test-account to explicitly allow a generated production test account.');
}
// Intentionally separate from the loopback-only validation runner.
await verifyAccountFlow('https://backend.arogio.com/api/v1', { legacy: process.argv.includes('--legacy') });
