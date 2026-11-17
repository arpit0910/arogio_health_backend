// Actual admin DOM/styles with synthetic doctor records. Never opens a database.
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
const department = {
  id: '33333333-3333-4333-8333-333333333333',
  source_key: 'sample:dept',
  name_en: 'Sample Cardiology',
  is_active: true,
};
const hospital = {
  id: '44444444-4444-4444-8444-444444444444',
  source_key: 'sample:hospital',
  name_en: 'Sample Community Hospital',
  city: 'Delhi',
  state: 'Delhi',
};
const rows = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    source_key: 'sample:doctor:1',
    name_en: 'Dr. Sample Sharma',
    name_hi: '',
    city: 'Delhi',
    state: 'Delhi',
    registration_number: 'SAMPLE-001',
    medical_council: 'Sample council',
    qualifications: ['MBBS', 'MD'],
    languages: ['Hindi', 'English'],
    consultation_fee: 500,
    experience_years: 10,
    source_url: 'https://example.test/doctor',
    address_line1: 'Illustrative address only',
    phone_1: '+919000000000',
    published: true,
    reviewedAt: new Date().toISOString(),
    version: 2,
    department_ids: [department.id],
    affiliations: [
      {
        hospital_id: hospital.id,
        days_of_week: [1, 3, 5],
        start_time: '09:00',
        end_time: '13:00',
        consultation_mode: 'in_person',
        role: 'Consultant',
        consultation_fee: 600,
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    source_key: 'sample:doctor:2',
    name_en: 'Dr. Sample Mehta',
    city: 'Pune',
    state: 'Maharashtra',
    registration_number: 'SAMPLE-002',
    published: false,
    version: 1,
    department_ids: [],
    affiliations: [],
  },
];
const code =
  fs.readFileSync(path.join(dir, 'admin.js'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(dir, 'directory-admin.js'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(dir, 'doctors.js'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(dir, 'provider-images.js'), 'utf8');
const out = path.join(__dirname, '../../.tmp/doctors-preview');
fs.mkdirSync(out, { recursive: true });
for (const mode of ['list', 'editor', 'review', 'image', 'empty']) {
  const data = JSON.stringify(mode === 'empty' ? [] : rows).replace(/</g, '\\u003c');
  const mock = `const previewRows=${data};globalThis.fetch=async(path)=>{const url=new URL(path,'https://preview.invalid');if(url.pathname.endsWith('/admin/departments'))return {ok:true,status:200,json:async()=>({items:[${JSON.stringify(department)}],total:1,hasNext:false})};if(url.pathname.endsWith('/admin/hospitals'))return {ok:true,status:200,json:async()=>({items:[${JSON.stringify(hospital)}],total:1,hasNext:false})};const selected=previewRows.find(row=>url.pathname.endsWith(row.id));const items=previewRows.filter(row=>(url.searchParams.get('status')!=='published'||row.published)&&(url.searchParams.get('status')!=='draft'||!row.published)&&(!url.searchParams.get('city')||row.city.toLowerCase()===url.searchParams.get('city').toLowerCase())&&(!url.searchParams.get('search')||(row.name_en+' '+row.name_hi+' '+row.city).toLowerCase().includes(url.searchParams.get('search').toLowerCase())));return {ok:true,status:200,json:async()=>selected||{items,total:items.length,hasNext:false,page:1}};};`;
  const action =
    mode === 'image'
      ? `await providerImageEditor('doctors','${rows[0].id}');`
      : mode === 'editor'
        ? `await doctorEditor('${rows[0].id}');`
        : mode === 'review'
          ? `await doctorReviewEditor('${rows[0].id}');`
          : '';
  const start = `tokens={accessToken:'preview-only'};$('login').hidden=true;$('portal').hidden=false;page='doctors';void(async()=>{await show();content.prepend(el('p','Synthetic preview records only. No database access.','notice'));${action}})();`;
  fs.writeFileSync(
    path.join(out, `${mode}.html`),
    html.replace('</body>', `<script>${mock}\n${code}\n${start}</script></body>`),
  );
}
console.log(
  'Doctor list, editor, source review and empty-state previews created. Synthetic data only.',
);
