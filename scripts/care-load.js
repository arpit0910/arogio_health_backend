// k6 staging-only public-read scenario. No credentials, health records or source mutations.
import http from 'k6/http';
import { check, sleep } from 'k6';
const base = (__ENV.BASE_URL || '').replace(/\/$/, '');
if (!/^https?:\/\/(localhost|127\.0\.0\.1|[^/]*staging[^/]*)(:\d+)?(\/.*)?$/.test(base) || __ENV.CONFIRM_STAGING !== 'true') throw new Error('Set a local/staging BASE_URL and CONFIRM_STAGING=true. Production is refused.');
export const options = { stages: [{ duration: '30s', target: 10 }, { duration: '2m', target: 50 }, { duration: '30s', target: 0 }], thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] } };
export default function () {
  for (const path of ['/care?kind=hospital&limit=20', '/care?kind=doctor&limit=20', '/public/articles?limit=12', '/public/blood-banks?limit=20', '/public/meditation/content?limit=12']) {
    const response = http.get(base + path, { tags: { endpoint: path.split('?')[0] } });
    check(response, { 'public read succeeds': result => result.status === 200 });
  }
  sleep(1);
}
