/* Read-only completeness baseline. Require an explicit review database connection. */
const { parseArgs } = require('node:util');
const { Pool } = require('pg');

const directoryBaselineSql = `
WITH candidates AS (
  SELECT 'hospital' AS kind, id, nullif(btrim(address_line1), '') IS NOT NULL AS address,
    coalesce(nullif(btrim(phone_1), ''), nullif(btrim(phone_2), '')) IS NOT NULL AS phone,
    latitude IS NOT NULL AND longitude IS NOT NULL AS coordinates, image_data IS NOT NULL AS photo
  FROM hospitals WHERE listed AND lower(btrim(city)) = lower($1)
  UNION ALL
  SELECT 'doctor', d.id, nullif(btrim(d.address_line1), '') IS NOT NULL,
    coalesce(nullif(btrim(d.phone_1), ''), nullif(btrim(d.phone_2), '')) IS NOT NULL,
    d.latitude IS NOT NULL AND d.longitude IS NOT NULL, d.image_data IS NOT NULL
  FROM doctors d JOIN care_directory_entries c ON c.id = d.id
  WHERE c.published AND lower(btrim(d.city)) = lower($1)
  UNION ALL
  SELECT 'blood-bank', id, nullif(btrim(address_en), '') IS NOT NULL,
    coalesce(nullif(btrim(phone), ''), nullif(btrim(emergency_phone), '')) IS NOT NULL,
    latitude IS NOT NULL AND longitude IS NOT NULL, NULL::boolean
  FROM blood_bank_directory_entries WHERE is_active AND lower(btrim(city)) = lower($1)
), sample AS (
  SELECT * FROM (
    SELECT *, row_number() OVER (PARTITION BY kind ORDER BY id) AS sample_order FROM candidates
  ) ranked ORDER BY sample_order, kind LIMIT $2
), kinds(kind) AS (VALUES ('hospital'), ('doctor'), ('blood-bank'))
SELECT kinds.kind,
  (SELECT count(*)::int FROM candidates WHERE candidates.kind = kinds.kind) AS eligible,
  count(sample.id)::int AS sampled,
  count(*) FILTER (WHERE address)::int AS address_present,
  count(*) FILTER (WHERE phone)::int AS phone_present,
  count(*) FILTER (WHERE coordinates)::int AS coordinates_present,
  count(sample.photo)::int AS photo_eligible,
  count(*) FILTER (WHERE photo)::int AS photo_present
FROM kinds LEFT JOIN sample USING (kind)
GROUP BY kinds.kind ORDER BY kinds.kind`;

async function main() {
  const { values } = parseArgs({ options: { city: { type: 'string' }, limit: { type: 'string', default: '100' } } });
  const city = values.city?.trim(), limit = Number(values.limit);
  if (!city || city.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Pass --city and a sample limit from 1 to 100.');
  }
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL for the intended review database.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      await client.query("SET LOCAL statement_timeout = '15s'");
      const { rows } = await client.query(directoryBaselineSql, [city, limit]);
      console.log(JSON.stringify({ city, limit, mode: 'presence-only', rows }, null, 2));
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  } finally {
    await pool.end();
  }
}

module.exports = { directoryBaselineSql };
if (require.main === module) {
  main().catch(error => {
    console.error('Directory baseline failed:', error.code || error.message);
    process.exitCode = 1;
  });
}
