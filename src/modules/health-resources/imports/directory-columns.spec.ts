import { prepareDoctors } from '../../doctors/imports/doctors.import';
import { prepareHospitals } from '../../hospitals/imports/hospitals.import';
import { prepareImport } from './import';

const file = (csv: string) => ({ originalname: 'partner.csv', buffer: Buffer.from(csv) } as Express.Multer.File);

describe('Directory spreadsheet imports', () => {
  it('maps common hospital headings and ignores source metadata', async () => {
    const result = await prepareHospitals(file(
      'Hospital ID,Hospital Name,City,State,Address,Source URL,Partner Notes\nH-42,Example Hospital,Jaipur,Rajasthan,Example Road,not-a-url,free text',
    ));
    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.value).toMatchObject({
      record_key: 'H-42', name_en: 'Example Hospital', address_line1: 'Example Road',
    });
    expect(result.rows[0]?.value).not.toHaveProperty('source_url');
  });

  it('keeps the doctor import key without accepting source or approval claims', async () => {
    const result = await prepareDoctors(file(
      'Doctor ID,Doctor Name,City,State,Source URL,Verified By\nDOC-42,Example Doctor,Jaipur,Rajasthan,not-a-url,Partner',
    ), { departments: [], hospitals: [] });
    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.value).toMatchObject({ record_key: 'DOC-42' });
    expect(result.rows[0]?.value).not.toHaveProperty('source_url');
  });

  it('accepts a minimal blood bank file with a stable alphanumeric ID', () => {
    const result = prepareImport('blood-banks', file(
      'Blood Bank ID,Blood Bank Name,City,State,Full Address,Source URL,Is Verified\nBANK-42,Example Centre,Jaipur,Rajasthan,Example Road,not-a-url,yes',
    ).buffer);
    expect(result.errors).toEqual([]);
    expect(result.banks[0]).toMatchObject({ record_key: 'BANK-42', is_verified: false });
    expect(result.banks[0]).not.toHaveProperty('source_url');
  });
});
