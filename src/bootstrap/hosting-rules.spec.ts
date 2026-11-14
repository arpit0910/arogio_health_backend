import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Pattern coverage only: the hosting owner must also validate Apache directives
// and live routing. This does not emulate Passenger or .htaccess precedence.
const fragment = readFileSync(
  join(__dirname, '../../hosting/apache-private-files.htaccess'),
  'utf8',
);
const denied = fragment.split(/\r?\n/).flatMap((line) => {
  const rule = /^RewriteRule (\S+) - \[F,L,NC\]$/.exec(line);
  const pattern = rule?.[1];
  return pattern ? [new RegExp(pattern, 'i')] : [];
});

describe('Shared-hosting private-file boundary', () => {
  it('blocks server implementation, migrations, dependencies and environment files', () => {
    expect(denied.length).toBe(3);
    for (const path of [
      'dist/main.js',
      'DIST/main.js',
      'dist',
      'src/main.ts',
      'drizzle/0014_care_directory.sql',
      'node_modules/pg/package.json',
      'scripts/check-database.cjs',
      'test/jest-e2e.json',
      'docs/DEPLOYMENT.md',
      'hosting/apache-private-files.htaccess',
      '.tmp/report.json',
      '.git/config',
      '.aws/credentials',
      '.env',
      '.env.production',
      '.env.local',
      'app.js',
      'package.json',
      'package-lock.json',
      'tsconfig.build.json',
      'nest-cli.json',
      'drizzle.config.ts',
      'eslint.config.mjs',
      'tsconfig.tsbuildinfo',
    ])
      expect(denied.some((rule) => rule.test(path))).toBe(true);
  });

  it('leaves application routes and virtual public assets unblocked', () => {
    for (const path of [
      '',
      'api/v1/health',
      'api/v1/ready',
      'api/v1/care',
      'api/v1/public/articles',
      'api/v1/profile/export',
      'admin',
      'admin/',
      'admin-assets/admin.js',
      'admin-assets/care.js',
      'admin-assets/bank-review.js',
      'status-assets/status.js',
      '.well-known/acme-challenge/token',
    ])
      expect(denied.some((rule) => rule.test(path))).toBe(false);
  });
});
