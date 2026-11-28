// Read-only inventory. Does not load credentials or connect to a database.
const { readFileSync, existsSync } = require('node:fs');
const { resolve, join } = require('node:path');

const directory = resolve(__dirname, '../../database/migrations');
const journal = JSON.parse(readFileSync(join(directory, 'meta/_journal.json'), 'utf8'));
console.log(`SQL migrations: ${directory}`);
for (const entry of journal.entries) {
  const filename = `${entry.tag}.sql`;
  if (!existsSync(join(directory, filename))) throw new Error(`Missing migration: ${filename}`);
  console.log(`${String(entry.idx).padStart(2, '0')}  ${filename}`);
}
console.log(`${journal.entries.length} committed migrations. Descriptions: database/migrations/README.md`);
