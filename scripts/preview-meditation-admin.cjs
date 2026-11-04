/* Actual admin DOM with seeded synthetic session state; not a production sign-in. */
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
async function main() {
  const db = new PGlite();
  try {
    for (const file of fs.readdirSync('drizzle').filter(file => file.endsWith('.sql')).sort())
      for (const statement of fs.readFileSync(path.join('drizzle', file), 'utf8').split('--> statement-breakpoint'))
        if (statement.trim()) await db.exec(statement);
    const { rows } = await db.query('select * from meditation_content order by sort_order,id');
    const items = rows.map(row => ({ ...row, videoId: row.video_id, durationSeconds: row.duration_seconds, sortOrder: row.sort_order,
      updatedAt: row.updated_at, createdAt: row.created_at, createdBy: row.created_by, youtubeUrl: row.video_id ? `https://www.youtube.com/watch?v=${row.video_id}` : '' }));
    const dir = 'src/modules/admin/public';
    let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g, '').replace(/<link[^>]*stylesheet[^>]*>/, '');
    const font = fs.readFileSync(path.join(dir, 'inter.ttf')).toString('base64');
    const css = fs.readFileSync(path.join(dir, 'admin.css'), 'utf8').replace("url('/admin-assets/inter.ttf')", `url(data:font/ttf;base64,${font})`);
    html = html.replace('</head>', `<style>${css}</style></head>`);
    const data = JSON.stringify(items).replace(/</g, '\\u003c');
    const mock = `const previewRows=${data}; globalThis.fetch=async(path)=>({ok:true,status:200,json:async()=>path.includes('?')?{items:previewRows,total:previewRows.length,hasNext:false,page:1}:previewRows.find(row=>path.endsWith(row.id))});`;
    const code = fs.readFileSync(path.join(dir, 'admin.js'), 'utf8') + '\n' + fs.readFileSync(path.join(dir, 'meditation.js'), 'utf8');
    const start = `tokens={accessToken:'preview-only'}; $('login').hidden=true; $('portal').hidden=false;page='meditation'; void (async()=>{await show();`;
    const out = '.impeccable/review/meditation'; fs.mkdirSync(out, { recursive: true });
    for (const [name, action] of [['list', ''], ['video', `await meditationEditor('${items.find(row=>row.kind==='video').id}');`], ['practice', `await meditationEditor('${items.find(row=>row.kind==='practice').id}');`]]) {
      fs.writeFileSync(path.join(out, `${name}.html`), html.replace('</body>', `<script>${mock}\n${code}\n${start}${action}})();</script></body>`));
    }
    fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify({ items, page: 1, hasNext: false, total: items.length }, null, 2));
    console.log('Admin meditation list and editors rendered using actual DOM functions and seeded content.');
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
