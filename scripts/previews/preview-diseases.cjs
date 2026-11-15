// Actual portal DOM and styles, with in-browser synthetic records. No database or network calls.
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
    department_id: '33333333-3333-4333-8333-333333333333',
    department: { name_en: 'Sample Department' },
    source_key: 'sample:cardiology',
    name_en: 'Sample condition A',
    name_hi: 'हृदय रोग',
    description_en: 'Illustrative catalog description only.',
    description_hi: 'हृदय से संबंधित देखभाल।',
    is_active: true,
    version: 1,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    department_id: '33333333-3333-4333-8333-333333333333',
    department: { name_en: 'Sample Department' },
    source_key: 'sample:neurology',
    name_en: 'Sample condition B',
    name_hi: 'तंत्रिका विज्ञान',
    description_en: 'Illustrative catalog description only.',
    description_hi: '',
    is_active: false,
    version: 1,
  },
];
const code =
  fs.readFileSync(path.join(dir, 'admin.js'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(dir, 'diseases.js'), 'utf8');
const out = path.join(__dirname, '../../.tmp/diseases-preview');
fs.mkdirSync(out, { recursive: true });
for (const mode of ['list', 'editor', 'empty']) {
  const data = JSON.stringify(mode === 'empty' ? [] : rows).replace(/</g, '\\u003c');
  const mock = `const previewRows=${data}; globalThis.fetch=async(path)=>{const url=new URL(path,'https://preview.invalid');if(url.pathname.endsWith('/admin/departments'))return {ok:true,status:200,json:async()=>({items:[{id:'33333333-3333-4333-8333-333333333333',name_en:'Sample Department',is_active:true}],total:1,hasNext:false})};const selected=previewRows.find(row=>url.pathname.endsWith(row.id));const items=previewRows.filter(row=>(url.searchParams.get('status')!=='active'||row.is_active)&&(url.searchParams.get('status')!=='inactive'||!row.is_active)&&(!url.searchParams.get('search')||(row.name_en+' '+row.name_hi).toLowerCase().includes(url.searchParams.get('search').toLowerCase())));return {ok:true,status:200,json:async()=>selected||{items,total:items.length,hasNext:false,page:1}};};`;
  const start = `tokens={accessToken:'preview-only'}; $('login').hidden=true; $('portal').hidden=false; page='diseases';void(async()=>{await show();content.prepend(el('p','Synthetic preview only. The application database is unchanged.','notice'));${mode === 'editor' ? `await diseaseEditor('${rows[0].id}');` : ''}})();`;
  fs.writeFileSync(
    path.join(out, `${mode}.html`),
    html.replace('</body>', `<script>${mock}\n${code}\n${start}</script></body>`),
  );
}
console.log('Disease list, editor and empty-state previews created with synthetic records.');
