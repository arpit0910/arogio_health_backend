import { Workbook } from 'exceljs';
import { workbookToCsv } from './workbook';
import { prepareImport, articleHeaders, bankHeaders } from './import';
async function bytes(workbook: Workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
describe('Excel directory imports', () => {
  it('uses the CSV validation rules and preserves bilingual text, text contacts, dates and boolean cells', async () => {
    const workbook = new Workbook(),
      sheet = workbook.addWorksheet('Articles');
    sheet.addRow(articleHeaders);
    const values: Record<string, unknown> = {
      id: 7,
      title_en: 'A title, with "quotes"',
      title_hi: 'स्वास्थ्य',
      content_en: 'First\nSecond',
      content_hi: 'लेख',
      category: 'Care',
      is_published: true,
      created_at: new Date('2026-10-01T10:00:00Z'),
      updated_at: new Date('2026-10-01T10:00:00Z'),
    };
    sheet.addRow(articleHeaders.map((key) => values[key] ?? ''));
    const parsed = prepareImport('articles', await workbookToCsv(await bytes(workbook)));
    expect(parsed.errors).toEqual([]);
    expect(parsed.articles[0]).toMatchObject({
      source_id: '7',
      title_hi: 'स्वास्थ्य',
      content_en: 'First\nSecond',
      is_published: true,
    });
    expect(parsed.articles[0]?.created_at.toISOString()).toBe('2026-10-01T10:00:00.000Z');
  });
  it('keeps contact strings intact and permits missing coordinate pairs', async () => {
    const workbook = new Workbook(),
      sheet = workbook.addWorksheet('Banks');
    sheet.addRow(bankHeaders);
    const row: Record<string, unknown> = {
      id: 1,
      name_en: 'Bank',
      city: 'Jaipur',
      state: 'Rajasthan',
      address_en: 'Address',
      phone: '0141-2721771',
      pincode: '012345',
      country_code: '+91',
      emergency_country_code: '+91',
      is_verified: true,
      is_24_7: true,
      is_government: false,
      component_facility: true,
      apheresis_facility: false,
      available_blood_groups: 'A+;O-',
    };
    sheet.addRow(bankHeaders.map((key) => row[key] ?? ''));
    const parsed = prepareImport('blood-banks', await workbookToCsv(await bytes(workbook)));
    expect(parsed.errors).toEqual([]);
    expect(parsed.banks[0]).toMatchObject({
      phone: '0141-2721771',
      pincode: '012345',
      latitude: null,
      longitude: null,
    });
  });
  it('rejects formulas even when they have cached results', async () => {
    const workbook = new Workbook(),
      sheet = workbook.addWorksheet('Data');
    sheet.addRow(['id', 'title_en']);
    sheet.addRow([1, { formula: '1+1', result: 2 }]);
    await expect(workbookToCsv(await bytes(workbook))).rejects.toThrow('plain values');
  });
  it('rejects multiple populated sheets, merged cells and malformed workbooks', async () => {
    const workbook = new Workbook();
    workbook.addWorksheet('One').addRow(['id']);
    workbook.addWorksheet('Two').addRow(['id']);
    await expect(workbookToCsv(await bytes(workbook))).rejects.toThrow('one visible worksheet');
    workbook.removeWorksheet('Two');
    workbook.getWorksheet('One')!.mergeCells('A1:B1');
    await expect(workbookToCsv(await bytes(workbook))).rejects.toThrow('Unmerge');
    await expect(workbookToCsv(Buffer.from('not an Excel file'))).rejects.toThrow('readable .xlsx');
  });
});
