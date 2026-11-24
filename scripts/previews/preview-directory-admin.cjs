// Real portal DOM and controls with synthetic data. Never connects to the API or a database.
const fs = require('node:fs'), path = require('node:path');
const dir = path.resolve(__dirname, '../../src/modules/administration/public');
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g, '').replace(/<link[^>]*stylesheet[^>]*>/, '');
const css = fs.readFileSync(path.join(dir, 'admin.css'), 'utf8').replace("url('/admin-assets/inter.ttf')", `url(data:font/ttf;base64,${fs.readFileSync(path.join(dir, 'inter.ttf')).toString('base64')})`);
html = html.replace('</head>', `<style>${css}</style></head>`);
const code = ['admin.js', 'directory-admin.js', 'hospitals.js', 'doctors.js', 'directory.js', 'bank-review.js'].map(name => fs.readFileSync(path.join(dir, name), 'utf8')).join('\n');
const rows = [
  { id: '00000000-0000-4000-8000-000000000001', name_en: 'Example district hospital', city: 'Delhi', state: 'Delhi', hospital_type: 'Government', version: 1, updated_at: '2026-11-17T00:00:00Z', published: false, listed: true, is_active: true, reviewedAt: null, registration_number: 'TEST-001', adminStatus: { active: true, approved: false, visibility: 'Active', reviewStatus: 'Draft', complete: true, missingFields: [] } },
  { id: '00000000-0000-4000-8000-000000000002', name_en: 'Example incomplete provider', city: 'Jaipur', state: 'Rajasthan', version: 1, updated_at: '2026-11-17T00:00:00Z', published: false, listed: true, is_active: true, reviewedAt: null, adminStatus: { active: true, approved: false, visibility: 'Active', reviewStatus: 'Draft', complete: false, missingFields: ['Address', 'Phone', 'Source URL'] } },
  { id: '00000000-0000-4000-8000-000000000003', name_en: 'Example inactive provider', city: 'Pune', state: 'Maharashtra', version: 1, updated_at: '2026-11-17T00:00:00Z', published: false, listed: false, is_active: false, reviewedAt: null, adminStatus: { active: false, approved: false, visibility: 'Inactive', reviewStatus: 'Draft', complete: true, missingFields: [] } },
];
const mock = `
const previewRows=${JSON.stringify(rows)};
window.previewRequests=[];
window.previewListQueries=[];
globalThis.fetch=async(path, options={})=>{
 const url=new URL(path,'https://preview.invalid');
 const summary={all:3,active:2,inactive:1,draft:3,incomplete:1,approved:0,expired:0,ready:1,withdrawn:0};
 let data;
 if(options.method==='POST'){
  const body=JSON.parse(options.body);window.previewRequests.push({path,body});
  const results=body.items.map(item=>{const row=previewRows.find(row=>row.id===item.id);return {id:item.id,name:row.name_en,status:row.adminStatus.complete?'approved':'failed',message:row.adminStatus.complete?'Approved and source review recorded.':'Missing required contact and source fields.'}});
  data={approved:results.filter(row=>row.status==='approved').length,failed:results.filter(row=>row.status==='failed').length,results};
 } else if(url.pathname.endsWith('/admin/me')) {
  if(options.headers?.Authorization!=='Bearer synthetic-preview')return {ok:false,status:403,json:async()=>({message:'Missing preview session'})};
  data={fullName:'Example reviewer'};
 } else if(url.pathname.endsWith('/summary')) data={hospitals:summary,doctors:summary,'blood-banks':summary};
 else {
  window.previewListQueries.push(url.search);
  const status=url.searchParams.get('status')??'all';
  const items=previewRows.filter(row=>status==='all'||status==='active'&&row.adminStatus.active||status==='inactive'&&!row.adminStatus.active||status==='incomplete'&&!row.adminStatus.complete||status==='draft'||status==='ready'&&row.adminStatus.active&&row.adminStatus.complete);
  data={items,summary,total:items.length,hasNext:false,page:1,missingCoordinates:3};
 }
 return {ok:true,status:200,json:async()=>data};
};`;
const out = path.resolve(__dirname, '../../.tmp/directory-admin-preview'); fs.mkdirSync(out, { recursive: true });
const checks = `
async function verifyDirectoryControls(kind){
 const assert=(value,message)=>{if(!value)throw new Error(message)};
 const waitFor=async(test)=>{for(let i=0;i<100;i++){if(test())return;await new Promise(resolve=>setTimeout(resolve,10))}throw new Error('UI update timed out')};
 const buttonNamed=label=>[...document.querySelectorAll('#content button')].find(button=>button.textContent===label);
 const rowBoxes=()=>[...document.querySelectorAll('#content tbody input[type=checkbox]')];
 assert(rowBoxes().length===3,'All index rows render');
 assert(getComputedStyle(rowBoxes()[0]).width === '16px' && getComputedStyle(rowBoxes()[0]).height === '16px','Row checkboxes have compact dimensions');
 assert(rowBoxes()[2].disabled,'Inactive checkbox is disabled');
 assert(buttonNamed('Approve selected').disabled,'Approval starts disabled');
 rowBoxes()[0].click();
 assert(!buttonNamed('Approve selected').disabled,'Checked row enables approval');
 buttonNamed('Approve selected').click();
 assert(!$('editor').open,'Approval skips the review form');
 assert(buttonNamed('Approve selected').disabled,'Approval is disabled while pending');
 await waitFor(()=>document.querySelector('.directory-approval-results')?.textContent.includes('1 approved. 0 not approved.'));
 const sent=window.previewRequests[0];
 assert(sent.body.items.length===1,'Only checked rows are sent');
 assert(sent.body.items[0].id===previewRows[0].id,'Checked identity is preserved');
 assert(Object.keys(sent.body).join() === 'items','Only selected record versions are submitted');
 assert(kind==='blood-banks'?sent.body.items[0].expectedUpdatedAt===previewRows[0].updated_at:sent.body.items[0].expectedVersion===1,'Current version is sent');
 assert(document.querySelector('.directory-approval-results').textContent.includes('1 approved. 0 not approved.'),'Per-record approval result is shown');
 assert(buttonNamed('Approve selected').disabled,'Reload clears old selection');
 const filter=document.querySelector('select[aria-label="Filter directory status"]');
 filter.value='inactive';filter.dispatchEvent(new Event('change'));
 await waitFor(()=>rowBoxes().length===1);
 assert(rowBoxes()[0].disabled,'Inactive index cannot approve inactive records');
 assert(buttonNamed('Approve selected').disabled,'Inactive index keeps approval disabled');
 const size=document.querySelector('select[aria-label="Records per page"]');
 size.value='500';size.dispatchEvent(new Event('change'));
 await waitFor(()=>rowBoxes().length===1);
 const query=new URLSearchParams(window.previewListQueries.at(-1));
 assert(query.get('limit')==='500'&&query.get('page')==='1'&&query.get('status')==='inactive','Page size resets pagination and preserves the filter');
 assert(document.querySelector('select[aria-label="Records per page"]').value==='500','Selected page size remains visible');
 page='overview';reset('Overview');await directoryOverviewStatus(requestRevision);
 const title=kind==='hospitals'?'Hospitals':kind==='doctors'?'Doctors':'Blood banks';
 const overviewRow=[...document.querySelectorAll('.directory-overview-row')].find(row=>row.querySelector('h3').textContent===title);
 const inactiveLabel=kind==='doctors'?'Withdrawn':'Inactive';
 [...overviewRow.querySelectorAll('button')].find(button=>button.querySelector('span').textContent===inactiveLabel).click();
 await waitFor(()=>page===kind&&document.querySelector('select[aria-label="Filter directory status"]')?.value==='inactive');
 assert(document.querySelector('nav button.active').dataset.page===kind,'Overview updates the active navigation item');
 document.body.dataset.verification='passed';
}
`;
for (const kind of ['hospitals', 'doctors', 'blood-banks']) {
  const start = `document.removeEventListener('DOMContentLoaded', restorePortal);tokens={accessToken:'synthetic-preview'};currentUser={fullName:'Example reviewer'};$('login').hidden=true;$('portal').hidden=false;page='${kind}';void(async()=>{await show();content.prepend(el('p','Synthetic preview only. No production data or database connection.','notice'));document.body.dataset.ready='true';})();`;
  fs.writeFileSync(path.join(out, `${kind}.html`), html.replace('</body>', `<script>${mock}\n${code}\n${start}</script></body>`));
  const verifyStart = `
    document.removeEventListener('DOMContentLoaded', restorePortal);
    page='${kind}';
    void(async()=>{
      try{
        const key='preview.started.${kind}';
        const reloaded=sessionStorage.getItem(key)==='yes';
        if(!reloaded){
          savePortalSession({accessToken:'synthetic-preview',refreshToken:'synthetic-refresh'});
          sessionStorage.setItem(key,'yes');
        }
        tokens=null;
        await restorePortal();
        if($('portal').hidden||!$('login').hidden)throw new Error('The saved session did not restore');
        if(reloaded)document.body.dataset.verification='restored';
        else await verifyDirectoryControls('${kind}');
      }catch(error){document.body.dataset.verification='failed';$('message').textContent=error.message}
    })();`;
  fs.writeFileSync(path.join(out, `${kind}-verify.html`), html.replace('</body>', `<script>${mock}\n${code}\n${checks}\n${verifyStart}</script></body>`));
}
console.log('Synthetic directory indexes generated at ' + out);
