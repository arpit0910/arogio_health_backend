/* Shared directory status and explicit page-scoped bulk approval controls. */
const directoryStatusOptions = (kind) => [
  ['all', 'All records'], ['active', kind === 'doctors' ? 'Not withdrawn' : 'Active'],
  ['inactive', kind === 'doctors' ? 'Withdrawn' : 'Inactive'], ['draft', 'Draft'],
  ['incomplete', 'Incomplete'], ['approved', 'Approved'], ['expired', 'Review expired'],
  ['withdrawn', 'Review withdrawn'], ['ready', 'Ready to approve'],
];
function directoryStatusFilter(kind, value, onChange) {
  const select = el('select');
  select.setAttribute('aria-label', 'Filter directory status');
  for (const [key, label] of directoryStatusOptions(kind)) { const option = el('option', label); option.value = key; select.append(option); }
  select.value = value; select.addEventListener('change', () => void safely(() => onChange(select.value)));
  return select;
}
function directorySummary(kind, summary, onFilter) {
  const wrap = el('div', null, 'directory-summary'), metrics = el('div', null, 'metrics');
  for (const [key, label] of directoryStatusOptions(kind).filter(([key]) => key !== 'withdrawn')) {
    const metric = button('', () => onFilter(key), 'metric directory-metric');
    metric.append(el('span', label), el('strong', number(summary?.[key] ?? 0)));
    metrics.append(metric);
  }
  wrap.append(metrics, el('p', 'Counts cover the current search and city across all pages. Status groups overlap: an inactive record may also be incomplete. Completeness refers to fields required for source approval.'));
  return wrap;
}
function directoryStatusCell(row) {
  const status = row.adminStatus, wrap = el('div', null, 'directory-status');
  if (!status) { wrap.append(el('span', 'Status unavailable')); return wrap; }
  wrap.append(el('span', status.visibility, status.active ? 'status-label status-active' : 'status-label status-inactive'), el('span', status.reviewStatus, status.approved ? 'status-label status-approved' : 'status-label'));
  return wrap;
}
function directoryCompletenessCell(row) {
  const wrap = el('div', null, 'directory-completeness'), missing = row.adminStatus?.missingFields ?? [];
  wrap.append(el('strong', missing.length ? 'Incomplete' : 'Complete'));
  if (missing.length) wrap.append(el('span', `Missing: ${missing.join(', ')}`));
  return wrap;
}
const directoryApprovalResults = new Map();
function directoryBulkApproval(kind, rows, reload) {
  const selected = new Map(), boxes = [], section = el('div', null, 'directory-bulk');
  const caption = el('span', '0 selected'), all = el('input'); all.type = 'checkbox';
  all.setAttribute('aria-label', 'Select all active records on this page');
  const label = el('label', null, 'check'); label.append(all, document.createTextNode('Select active records on this page'));
  const approve = button('Approve selected', () => {
    const chosen = [...selected.values()], epoch = authEpoch;
    if (!chosen.length) return;
    const fields = [field('reviewerName', 'Reviewer name', currentUser?.fullName ?? ''), field('reviewerQualification', 'Reviewer qualification or role'), field('evidence', 'Evidence checked for every selected record (20+ characters)', '', 'textarea')];
    if (kind === 'blood-banks') fields.push(field('sourceUrl', 'Shared HTTPS source URL (required if selected records have no saved source)', '', 'url'));
    fields.push(field('confirmedSource', 'I checked the source and contact details for every selected record', false, 'checkbox'));
    openEditor(`Approve ${chosen.length} selected ${kind.replace('-', ' ')}?`, fields, async data => {
      const payload = {
        items: chosen.map(row => kind === 'blood-banks' ? { id: row.id, expectedUpdatedAt: row.updated_at } : { id: row.id, expectedVersion: row.version }),
        reviewerName: String(data.get('reviewerName') ?? ''), reviewerQualification: String(data.get('reviewerQualification') ?? ''), evidence: String(data.get('evidence') ?? ''), confirmedSource: data.get('confirmedSource') === 'on',
      };
      if (kind === 'blood-banks' && String(data.get('sourceUrl') ?? '').trim()) payload.sourceUrl = String(data.get('sourceUrl')).trim();
      const preventCancel = event => event.preventDefault();
      $('cancel-editor').disabled = true; $('close-editor').disabled = true; $('editor').addEventListener('cancel', preventCancel);
      try {
        const result = await send(`/admin/directory-approvals/${kind}`, payload);
        if (authEpoch !== epoch) return;
        directoryApprovalResults.set(kind, { epoch, result });
        await reload();
      } finally { $('cancel-editor').disabled = false; $('close-editor').disabled = false; $('editor').removeEventListener('cancel', preventCancel); }
    }, 'Only checked records on this page are included. Inactive, changed or still-incomplete records are left unchanged with a reason. A shared source URL can complete missing blood-bank source information. Approval records source review and does not change missing information.');
    const names = el('ul', null, 'directory-selected-records');
    for (const row of chosen) names.append(el('li', row.name_en));
    $('editor-fields').prepend(names);
    $('save-editor').textContent = `Approve ${chosen.length} records`;
  }, 'primary');
  approve.disabled = true;
  function update() {
    caption.textContent = `${selected.size} selected`; approve.disabled = selected.size === 0;
    const enabled = boxes.filter(box => !box.disabled);
    all.checked = enabled.length > 0 && enabled.every(box => box.checked);
    all.indeterminate = selected.size > 0 && !all.checked; all.disabled = !enabled.length;
  }
  const clear = button('Clear selection', () => { selected.clear(); boxes.forEach(box => { box.checked = false; }); update(); });
  all.addEventListener('change', () => { for (const box of boxes.filter(box => !box.disabled)) { box.checked = all.checked; if (box.checked) selected.set(box.directoryRow.id, box.directoryRow); else selected.delete(box.directoryRow.id); } update(); });
  section.append(label, caption, approve, clear, el('p', 'Inactive records cannot be selected for bulk approval. Activate or restore them individually first. Selection is cleared when you change pages or filters.'));
  const prior = directoryApprovalResults.get(kind);
  const results = el('div', null, 'directory-approval-results');
  if (prior?.epoch === authEpoch) {
    const summary = el('p', `${prior.result.approved} approved. ${prior.result.failed} not approved.`); summary.setAttribute('role', 'status');
    results.append(el('h3', 'Last bulk approval'), summary, table(['Record', 'Result', 'Details'], prior.result.results.map(row => [row.name, row.status === 'approved' ? 'Approved' : 'Not approved', row.message])));
  }
  return { section, results, checkbox: row => {
    const input = el('input'); input.type = 'checkbox'; input.directoryRow = row;
    input.disabled = row.adminStatus?.active === false;
    input.setAttribute('aria-label', `Select ${row.name_en}${input.disabled ? '. Inactive: activate or restore before bulk approval' : ''}`);
    input.addEventListener('change', () => { if (input.checked) selected.set(row.id, row); else selected.delete(row.id); update(); });
    boxes.push(input); queueMicrotask(update); return input;
  } };
}

async function directoryOverviewStatus(revision) {
  const section = panel('Directory status'), placeholder = el('p', 'Loading directory status…'); section.append(placeholder); content.append(section);
  try {
    const data = await api('/admin/directory-approvals/summary'); if (revision !== requestRevision) return;
    placeholder.remove();
    for (const [kind, title] of [['hospitals', 'Hospitals'], ['blood-banks', 'Blood banks'], ['doctors', 'Doctors']]) {
      const row = el('div', null, 'directory-overview-row'); row.append(el('h3', title));
      row.append(directorySummary(kind, data[kind], status => openDirectoryStatus(kind, status)));
      section.append(row);
    }
  } catch { if (revision === requestRevision) placeholder.textContent = 'Directory status could not load. Open a directory index to retry.'; }
}

function openDirectoryStatus(kind, status) {
  page = kind;
  return kind === 'hospitals' ? hospitalsPage(1, '', '', status) : kind === 'doctors' ? doctorsPage(1, '', '', status) : directoryPage(kind, 1, '', status);
}
