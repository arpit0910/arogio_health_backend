import { parseCsv } from './csv';
describe('CSV transport', () => {
  it('preserves bilingual text, quoted multiline values and escaped quotes', () => {
    expect(
      parseCsv(Buffer.from('\uFEFFid,text\r\n1,"हिन्दी, ""quoted""\r\nnext"\r\n')),
    ).toEqual([{ id: '1', text: 'हिन्दी, "quoted"\r\nnext' }]);
  });
  it.each([
    'id,id\n1,2',
    'id,text\n1',
    'id,text\n1,"open',
    'id,text\n1,"closed"junk',
    'id,text\n1,bad"quote',
  ])('rejects malformed input without guessing columns: %s', (value) => {
    expect(() => parseCsv(Buffer.from(value))).toThrow();
  });
  it('keeps formula-looking data inert', () => {
    expect(parseCsv(Buffer.from('id,text\n1,=2+2'))[0]?.text).toBe('=2+2');
  });
});
