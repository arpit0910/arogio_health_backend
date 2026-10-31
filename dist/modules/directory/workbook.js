"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workbookToCsv = workbookToCsv;
const exceljs_1 = require("exceljs");
const yauzl_1 = require("yauzl");
async function validateArchive(buffer) {
    await new Promise((resolve, reject) => {
        (0, yauzl_1.fromBuffer)(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
            if (error || !zip)
                return reject(new Error('This is not a readable .xlsx workbook.'));
            let entries = 0, bytes = 0, finished = false;
            const fail = (issue) => {
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
            zip.on('entry', (entry) => {
                if (++entries > 1000 ||
                    entry.uncompressedSize > 32 * 1024 * 1024 ||
                    entry.isEncrypted() ||
                    /vbaProject\.bin$/i.test(entry.fileName))
                    return fail(new Error('Use an unencrypted .xlsx workbook without macros, up to 32 MB expanded.'));
                zip.openReadStream(entry, (issue, stream) => {
                    if (issue || !stream)
                        return fail(new Error('Workbook archive could not be read.'));
                    stream.on('error', fail);
                    stream.on('data', (chunk) => {
                        bytes += chunk.length;
                        if (bytes > 32 * 1024 * 1024) {
                            stream.destroy();
                            fail(new Error('Workbook exceeds the 32 MB expanded limit.'));
                        }
                    });
                    stream.on('end', () => {
                        if (!finished)
                            zip.readEntry();
                    });
                });
            });
            zip.readEntry();
        });
    });
}
function valueText(value, row, column) {
    if (value == null)
        return '';
    if (typeof value === 'string' || typeof value === 'number')
        return String(value);
    if (typeof value === 'boolean')
        return value ? '1' : '0';
    if (value instanceof Date)
        return value.toISOString();
    if ('richText' in value)
        return value.richText.map((part) => part.text).join('');
    throw new Error(`Row ${row}, column ${column}: use plain values, not formulas, errors or hyperlinks. Paste values only.`);
}
async function workbookToCsv(buffer) {
    if (!buffer.length || buffer.length > 8 * 1024 * 1024)
        throw new Error('Choose an Excel or CSV file up to 8 MB.');
    await validateArchive(buffer);
    const workbook = new exceljs_1.Workbook();
    await workbook.xlsx.load(buffer);
    const sheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
    if (sheets.length !== 1 || sheets[0].state !== 'visible')
        throw new Error('Use one visible worksheet containing the header and records. Remove other populated worksheets.');
    const sheet = sheets[0];
    if (sheet.rowCount > 5001 || sheet.columnCount > 50)
        throw new Error('Import up to 5,000 records and 50 columns.');
    if (sheet.model.merges.length)
        throw new Error('Unmerge cells before importing.');
    const lines = [];
    for (let row = 1; row <= sheet.rowCount; row++) {
        const values = [];
        for (let col = 1; col <= sheet.columnCount; col++)
            values.push(`"${valueText(sheet.getCell(row, col).value, row, col).replace(/"/g, '""')}"`);
        lines.push(values.join(','));
    }
    return Buffer.from(lines.join('\n'));
}
//# sourceMappingURL=workbook.js.map