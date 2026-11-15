// Actual admin DOM/styles with synthetic hospital records. Never opens a database.
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../../src/modules/administration/public');
let html = fs
  .readFileSync(path.join(dir, 'index.html'), 'utf8')
  .replace(/<script[^>]*src=[^>]*><\/script>/g, '')
  .replace(/<link[^>]*stylesheet[^>]*>/, '');
const font = fs.readFileSync(path.join(dir, 'inter.ttf')).toString('base64');
const css = fs
  .readFileSync(path.join(dir, 'admin.css'), 'utf8')
  .replace("url('/admin-assets/inter.ttf')", `url(data:font/ttf;base64,${font})`);
html = html.replace('</head>', `<style>${css}</style></head>`);
const rows = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    source_key: 'sample:hospital:1',
    name_en: 'Sample Community Hospital',
    name_hi: 'उदाहरण सामुदायिक अस्पताल',
    hospital_type: 'Government',
    address_line1: 'Illustrative address only',
    city: 'Delhi',
    state: 'Delhi',
    country_code_1: '+91',
    phone_1: '9000000000',
    source_url: 'https://example.test/hospital',
    published: true,
    reviewedAt: '2026-11-15T00:00:00Z',
    version: 2,
    accepts_ayushman: true,
    is_cashless: null,
    cashless_schemes: [],
    specialties: [],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    source_key: 'sample:hospital:2',
    name_en: 'Sample Private Hospital',
    name_hi: '',
    hospital_type: 'Private',
    city: 'Pune',
    state: 'Maharashtra',
    published: false,
    version: 1,
    specialties: [],
    cashless_schemes: [],
  },
];
const code =
  fs.readFileSync(path.join(dir, 'admin.js'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(dir, 'hospitals.js'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(dir, 'provider-images.js'), 'utf8');
const out = path.join(__dirname, '../../.tmp/hospitals-preview');
fs.mkdirSync(out, { recursive: true });
for (const mode of ['list', 'editor', 'review', 'image', 'empty']) {
  const data = JSON.stringify(mode === 'empty' ? [] : rows).replace(/</g, '\\u003c');
  const mock = `const previewRows=${data};globalThis.fetch=async(path)=>{const url=new URL(path,'https://preview.invalid');const selected=previewRows.find(row=>url.pathname.endsWith(row.id));const items=previewRows.filter(row=>(url.searchParams.get('status')!=='published'||row.published)&&(url.searchParams.get('status')!=='draft'||!row.published)&&(!url.searchParams.get('city')||row.city.toLowerCase()===url.searchParams.get('city').toLowerCase())&&(!url.searchParams.get('search')||(row.name_en+' '+row.name_hi+' '+row.city).toLowerCase().includes(url.searchParams.get('search').toLowerCase())));return {ok:true,status:200,json:async()=>selected||{items,total:items.length,hasNext:false,page:1}};};`;
  const action =
    mode === 'image'
      ? `await providerImageEditor('hospitals','${rows[0].id}');`
      : mode === 'editor'
        ? `await hospitalEditor('${rows[0].id}');`
        : mode === 'review'
          ? `await hospitalReviewEditor('${rows[0].id}');`
          : '';
  const start = `tokens={accessToken:'preview-only'};$('login').hidden=true;$('portal').hidden=false;page='hospitals';void(async()=>{await show();content.prepend(el('p','Synthetic preview records only. No database access.','notice'));${action}})();`;
  fs.writeFileSync(
    path.join(out, `${mode}.html`),
    html.replace('</body>', `<script>${mock}\n${code}\n${start}</script></body>`),
  );
}
console.log(
  'Hospital list, editor, source review and empty-state previews created. Synthetic data only.',
);
