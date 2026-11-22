/* Shared directory status and explicit page-scoped bulk approval controls. */
const directoryStatusOptions = (kind) => [
  ['all', 'All records'], ['active', kind === 'doctors' ? 'Not withdrawn' : 'Active'],
  ['inactive', kind === 'doctors' ? 'Withdrawn' : 'Inactive'], ['draft', 'Draft'],
  ['incomplete', 'Incomplete'], ['approved', 'Approved'], ['expired', 'Review expired'],
  ['withdrawn', 'Review withdrawn'], ['ready', 'Ready to approve'],
];
const directoryPageSizes = { hospitals: 20, doctors: 20, 'blood-banks': 25 };
function directoryPageSizeSelector(kind, onChange) {
  const select = el('select');
  select.setAttribute('aria-label', 'Records per page');
  const defaultSize = kind === 'blood-banks' ? 25 : 20;
  for (const size of [defaultSize, 50, 100, 250, 500]) {
    const option = el('option', `${size} per page`);
    option.value = size;
    select.append(option);
  }
  select.value = directoryPageSizes[kind];
  select.addEventListener('change', () => {
    directoryPageSizes[kind] = Number(select.value);
    void safely(onChange);
  });
  return select;
}
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
function directoryBulkApproval(kind, reload) {
  const selected = new Map(), boxes = [], section = el('div', null, 'directory-bulk');
  const caption = el('span', '0 selected'), all = el('input'); all.type = 'checkbox';
  const label = el('label', null, 'check');
  label.append(all, document.createTextNode('Select all eligible records on this page'));
  let pending = false;
  let eligibleCount = 0;

  async function approveRecords(rows) {
    if (!rows.length || pending) return;
    const epoch = authEpoch, revision = requestRevision;
    const items = rows.map(row => kind === 'blood-banks'
      ? { id: row.id, expectedUpdatedAt: row.updated_at }
      : { id: row.id, expectedVersion: row.version });
    pending = true;
    section.setAttribute('aria-busy', 'true');
    update();
    try {
      const result = await send(`/admin/directory-approvals/${kind}`, { items });
      if (authEpoch !== epoch) return;
      directoryApprovalResults.set(kind, { epoch, result });
      if (requestRevision === revision) await reload();
    } finally {
      pending = false;
      section.setAttribute('aria-busy', 'false');
      update();
    }
  }

  const approve = button('Approve selected', () => approveRecords([...selected.values()]), 'primary');
  function update() {
    caption.textContent = pending ? 'Approving?' : `${selected.size} selected`;
    approve.disabled = pending || selected.size === 0;
    all.checked = eligibleCount > 0 && selected.size === eligibleCount;
    all.indeterminate = selected.size > 0 && !all.checked;
    all.disabled = pending || eligibleCount === 0;
    for (const { input, eligible } of boxes) input.disabled = pending || !eligible;
  }
  all.addEventListener('change', () => {
    selected.clear();
    for (const { input, row, eligible } of boxes) {
      if (!eligible) continue;
      input.checked = all.checked;
      if (input.checked) selected.set(row.id, row);
    }
    update();
  });
  update();
  section.append(label, caption, approve);
  const prior = directoryApprovalResults.get(kind);
  const results = el('div', null, 'directory-approval-results');
  if (prior?.epoch === authEpoch) {
    const summary = el('p', `${prior.result.approved} approved. ${prior.result.failed} not approved.`); summary.setAttribute('role', 'status');
    results.append(el('h3', 'Last bulk approval'), summary, table(['Record', 'Result', 'Details'], prior.result.results.map(row => [row.name, row.status === 'approved' ? 'Approved' : 'Not approved', row.message])));
  }
  return { section, results, checkbox: row => {
    const input = el('input'); input.type = 'checkbox';
    const eligible = row.adminStatus?.active !== false;
    input.disabled = !eligible;
    if (eligible) {
      eligibleCount++;
      all.disabled = false;
    }
    input.setAttribute('aria-label', `Select ${row.name_en}${eligible ? '' : ' (inactive)'}`);
    input.addEventListener('change', () => {
      if (input.checked) selected.set(row.id, row);
      else selected.delete(row.id);
      update();
    });
    boxes.push({ input, row, eligible });
    return input;
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
