/** RFC-style CSV: BOM, CRLF, escaped quotes and quoted multiline fields. Never evaluates cells. */
export function parseCsv(buffer: Buffer): Record<string, string>[] {
  if (!buffer.length || buffer.length > 8 * 1024 * 1024)
    throw new Error('Choose a CSV file up to 8 MB.');
  const source = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false,
    closed = false;
  const pushField = () => {
    row.push(field);
    field = '';
    closed = false;
    if (row.length > 50) throw new Error('Too many CSV columns.');
  };
  const pushRow = () => {
    pushField();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > 5001) throw new Error('Import up to 5,000 records at a time.');
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
      continue;
    }
    if (char === ',') pushField();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      pushRow();
    } else if (char === '"') {
      if (field || closed) throw new Error('Unexpected quote in CSV.');
      quoted = true;
    } else if (closed) {
      if (char !== ' ' && char !== '\t') throw new Error('Unexpected text after a quoted field.');
    } else field += char;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (field || row.length || closed) pushRow();
  const header = rows.shift()?.map((value) => value.trim());
  if (!header?.length || new Set(header).size !== header.length || header.some((value) => !value))
    throw new Error('CSV needs unique, non-empty column headers.');
  if (!rows.length) throw new Error('CSV has no data rows.');
  return rows.map((values, index) => {
    if (values.length !== header.length)
      throw new Error(`Row ${index + 2} has ${values.length} columns; expected ${header.length}.`);
    return Object.fromEntries(header.map((key, i) => [key, values[i]!]));
  });
}
