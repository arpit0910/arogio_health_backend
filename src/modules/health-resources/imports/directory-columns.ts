/** Normalize common spreadsheet headings without trusting provider or approval metadata. */
export const generalDirectoryAliases: Record<string, string> = {
  record_id: 'id', source_key: 'record_key', import_key: 'record_key', name: 'name_en',
  district: 'city', town: 'city', locality: 'landmark',
  postal_code: 'pincode', zip_code: 'pincode', pin_code: 'pincode',
  lat: 'latitude', lon: 'longitude', lng: 'longitude', telephone: 'phone',
};

export function selectDirectoryColumns(
  rows: Record<string, string>[], supported: readonly string[], aliases: Record<string, string>,
) {
  const fields = new Set(supported);
  return rows.map((row, index) => {
    const selected: Record<string, string> = {};
    for (const [label, raw] of Object.entries(row)) {
      const header = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const key = Object.hasOwn(aliases, header) ? aliases[header]! : header;
      if (!fields.has(key)) continue;
      const value = raw.trim();
      if (value && selected[key] && selected[key] !== value)
        throw new Error(`Row ${index + 2}: conflicting columns for ${key}.`);
      if (value || !(key in selected)) selected[key] = value;
    }
    return selected;
  });
}

export function directoryImportKey(value: string, kind: 'doctor' | 'hospital') {
  if (/^\d{1,20}$/.test(value)) return `swasthya:${kind}:${value}`;
  return /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,99}$/.test(value) ? value : '';
}
