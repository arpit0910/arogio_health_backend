const { readFileSync, writeFileSync } = require('node:fs');
const { parseCsv } = require('../../dist/modules/health-resources/imports/csv.js');

function normalize(value) {
  return (value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stageDoctors(rows, publishedHospitals) {
  const candidates = new Map();
  const conflicts = new Set();
  let skipped = 0;
  const unresolved = new Set();
  for (const row of rows) {
    const id = row.doctor_id?.trim() ?? '';
    const name = row.doctor_full_name?.trim() ?? '';
    const city = row.city?.trim() ?? '';
    const state = row.state?.trim() ?? '';
    const legacyHospital = row.hospital_id?.trim() ?? '';
    const matches = publishedHospitals?.filter(item =>
      normalize(item.name_en) === normalize(row.hospital_name) &&
      normalize(item.city) === normalize(row.hospital_city || city));
    const hospital = !matches ? 'swasthya:hospital:' + legacyHospital
      : matches.length === 1 ? matches[0].record_key || matches[0].id : '';
    if (!hospital) { unresolved.add(id); continue; }
    if (!/^DOC-JAI-[A-Z0-9]{12}$/.test(id) || !name || name.length > 200 || /^[=+@-]/.test(name) ||
        !city || !state || !/^\d{1,20}$/.test(legacyHospital)) {
      skipped++;
      continue;
    }
    const previous = candidates.get(id);
    if (previous) {
      if (previous.name !== name || previous.city !== city || previous.state !== state) {
        conflicts.add(id);
      } else {
        previous.hospitals.add(hospital);
      }
    } else {
      candidates.set(id, { id, name, city, state, hospitals: new Set([hospital]) });
    }
  }
  const output = [...candidates.values()].filter(row => !conflicts.has(row.id) && !unresolved.has(row.id) && row.hospitals.size <= 30);
  return { output, skipped, conflicts: conflicts.size, unresolved: unresolved.size };
}

function main() {
  const [input, destination, references] = process.argv.slice(2);
  if (!input || !destination) throw new Error('Usage: node scripts/database/stage-jaipur-doctors.cjs input.csv output.csv [published-hospitals.json]');
  const rows = parseCsv(readFileSync(input));
  const hospitals = references ? JSON.parse(readFileSync(references, 'utf8').replace(/^\uFEFF/, '')) : undefined;
  const { output, skipped, conflicts, unresolved } = stageDoctors(rows, hospitals);
  if (!output.length) throw new Error('No candidates passed the staging checks.');
  const quote = value => '"' + value.replaceAll('"', '""') + '"';
  const lines = ['record_key,name_en,city,state,hospital_record_keys',
    ...output.map(row => [
      row.id, row.name, row.city, row.state,
      [...row.hospitals].sort().join(';'),
    ].map(quote).join(',')),
  ];
  writeFileSync(destination, lines.join('\n') + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ sourceRows: rows.length, candidates: output.length, skipped, conflicts, unresolved }));
}

module.exports = { stageDoctors };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
