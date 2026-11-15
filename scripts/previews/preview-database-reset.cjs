// Real portal UI with synthetic counts only. This never connects to a database.
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../../src/modules/administration/public');
const out = path.join(__dirname, '../../.tmp/database-reset-preview');
fs.mkdirSync(out, { recursive: true });
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
  .replace(/<script[^>]*src=[^>]*><\/script>/g, '').replace(/<link[^>]*stylesheet[^>]*>/, '');
const css = fs.readFileSync(path.join(dir, 'admin.css'), 'utf8')
  .replace("url('/admin-assets/inter.ttf')", `url(data:font/ttf;base64,${fs.readFileSync(path.join(dir, 'inter.ttf')).toString('base64')})`);
html = html.replace('</head>', `<style>${css}</style></head>`);
const code = ['admin.js', 'database-reset.js'].map(file => fs.readFileSync(path.join(dir, file), 'utf8')).join('\n');
const tables = JSON.parse(fs.readFileSync(path.join(__dirname, '../../database/table-catalog.json'), 'utf8')).map(t => ({name:t.table, records:'12'}));
const mock = `globalThis.resetCalls=[];globalThis.fetch=async(path,options)=>{resetCalls.push({path,body:JSON.parse(options.body||'{}')});return {ok:true,status:201,json:async()=>path.endsWith('/preview')?{environment:'Synthetic preview',host:'example.test',database:'arogio_preview',tables:${JSON.stringify(tables)},confirmation:'RESET ALL APP DATA',previewToken:'synthetic-preview-only'}:{reset:true,tableCount:25,remainingRecords:0}}};`;
const start = `tokens={accessToken:'preview-only'};$('login').hidden=true;$('portal').hidden=false;page='database-reset';void show();`;
fs.writeFileSync(path.join(out, 'index.html'), html.replace('</body>', `<script>${mock}\n${code}\n${start}</script></body>`));
console.log('Database reset preview created with synthetic data; no database access.');
