import { Workbook, type CellValue } from 'exceljs';
import { fromBuffer, type Entry } from 'yauzl';
import { categoryInput, type DirectoryKind } from './directory.input';
import { z } from 'zod';
import JSZip from 'jszip';

// Inspect and stream every ZIP entry before allowing the workbook reader to allocate XML.
async function validateArchive(buffer: Buffer) {
  await new Promise<void>((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('This is not a readable .xlsx workbook.'));
      let entries = 0,
        bytes = 0,
        finished = false;
      const fail = (issue: Error) => {
        if (!finished) {
          finished = true;
          zip.close();
          reject(issue);
        }
      };
      zip.on('error', fail);
      zip.on('end', () => {
        if (!finished) {
          finished = true;
          resolve();
        }
      });
      zip.on('entry', (entry: Entry) => {
        if (
          ++entries > 1000 ||
          entry.uncompressedSize > 32 * 1024 * 1024 ||
          entry.isEncrypted() ||
          /vbaProject\.bin$/i.test(entry.fileName)
        )
          return fail(
            new Error('Use an unencrypted .xlsx workbook without macros, up to 32 MB expanded.'),
          );
        zip.openReadStream(entry, (issue, stream) => {
          if (issue || !stream) return fail(new Error('Workbook archive could not be read.'));
          stream.on('error', fail);
          stream.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > 32 * 1024 * 1024) {
              stream.destroy();
              fail(new Error('Workbook exceeds the 32 MB expanded limit.'));
            }
          });
          stream.on('end', () => {
            if (!finished) zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}
function valueText(value: CellValue, row: number, column: number): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) return value.toISOString();
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  throw new Error(
    `Row ${row}, column ${column}: use plain values, not formulas, errors or hyperlinks. Paste values only.`,
  );
}
async function loadWorkbook(buffer: Buffer) {
  if (!buffer.length || buffer.length > 8 * 1024 * 1024)
    throw new Error('Choose an Excel or CSV file up to 8 MB.');
  await validateArchive(buffer);
  // ExcelJS expects unprefixed SpreadsheetML elements. Some valid exporters
  // (including the supplied library) use x: elements instead. Normalize only
  // the declared main namespace, never cell text, formulas or relationship IDs.
  const archive = await JSZip.loadAsync(buffer);
  let changed = false;
  for (const entry of Object.values(archive.files)) {
    if (entry.dir || !entry.name.endsWith('.xml')) continue;
    let xml = await entry.async('string');
    const declaration =
      /xmlns:([A-Za-z_][\w.-]*)="http:\/\/schemas.openxmlformats.org\/spreadsheetml\/2006\/main"/.exec(
        xml,
      );
    if (declaration) {
      const prefix = declaration[1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      xml = xml
        .replace(
          declaration[0],
          'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
        )
        .replace(new RegExp(`(<\\/?)(?:${prefix}):(?=[A-Za-z_])`, 'g'), '$1');
      changed = true;
    }
    // Table styling is irrelevant to a values-only import; absolute table
    // relationship targets from some exporters are not resolved by ExcelJS.
    if (entry.name.startsWith('xl/worksheets/') && /<tableParts\b/.test(xml)) {
      xml = xml.replace(/<tableParts\b[^>]*>[\s\S]*?<\/tableParts>/g, '');
      changed = true;
    }
    archive.file(entry.name, xml);
  }
  if (changed) buffer = await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<Workbook['xlsx']['load']>[0]);
  return workbook;
}
function sheetCsv(sheet: import('exceljs').Worksheet): Buffer {
  if (sheet.rowCount > 5001 || sheet.columnCount > 50)
    throw new Error('Import up to 5,000 records and 50 columns.');
  if (sheet.model.merges.length) throw new Error('Unmerge cells before importing.');
  const lines: string[] = [];
  for (let row = 1; row <= sheet.rowCount; row++) {
    const values: string[] = [];
    for (let col = 1; col <= sheet.columnCount; col++)
      values.push(`"${valueText(sheet.getCell(row, col).value, row, col).replace(/"/g, '""')}"`);
    lines.push(values.join(','));
  }
  return Buffer.from(lines.join('\n'));
}
export async function workbookToCsv(buffer: Buffer): Promise<Buffer> {
  const workbook = await loadWorkbook(buffer);
  const sheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
  if (sheets.length !== 1 || sheets[0]!.state !== 'visible')
    throw new Error(
      'Use one visible worksheet containing the header and records. Remove other populated worksheets.',
    );
  return sheetCsv(sheets[0]!);
}
export async function readDirectoryWorkbook(buffer: Buffer, kind: DirectoryKind) {
  const workbook = await loadWorkbook(buffer);
  const sheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
  if (sheets.length === 1)
    return { csv: await workbookToCsv(buffer), categories: [] as z.infer<typeof categoryInput>[] };
  if (
    kind !== 'articles' ||
    sheets.some(
      (sheet) =>
        sheet.state !== 'visible' || !['Articles', 'Categories', 'Read Me'].includes(sheet.name),
    )
  )
    throw new Error(
      'Use one data worksheet, or Articles, Categories and optional Read Me worksheets.',
    );
  const articles = workbook.getWorksheet('Articles'),
    categories = workbook.getWorksheet('Categories');
  if (!articles || !categories) throw new Error('Articles and Categories worksheets are required.');
  if (categories.rowCount > 301 || categories.columnCount > 5 || categories.model.merges.length)
    throw new Error('Use up to 300 unmerged category rows.');
  const headers = ['Category', 'Category (Hindi)', 'Articles', 'Description'];
  for (let i = 0; i < headers.length; i++)
    if (valueText(categories.getCell(1, i + 1).value, 1, i + 1) !== headers[i])
      throw new Error(
        'Categories headers must be Category, Category (Hindi), Articles, Description and optional image_url.',
      );
  if (
    categories.columnCount === 5 &&
    valueText(categories.getCell(1, 5).value, 1, 5) !== 'image_url'
  )
    throw new Error('Unknown Categories column.');
  const seen = new Set<string>();
  const result: z.infer<typeof categoryInput>[] = [];
  for (let row = 2; row <= categories.rowCount; row++) {
    const values = Array.from({ length: 5 }, (_, col) =>
      valueText(categories.getCell(row, col + 1).value, row, col + 1),
    );
    if (values.every((value) => !value)) continue;
    const value = categoryInput.parse({
      name: values[0],
      name_hi: values[1],
      description: values[3],
      image_url: values[4],
    });
    if (seen.has(value.name)) throw new Error(`Duplicate category: ${value.name}`);
    seen.add(value.name);
    result.push(value);
  }
  return { csv: sheetCsv(articles), categories: result };
}
