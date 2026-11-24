/* Shared directory status and explicit page-scoped bulk approval controls. */
const directoryStatusOptions = (kind) => [
  ['all', 'All records'], ['active', kind === 'doctors' ? 'Not withdrawn' : 'Active'],
  ['inactive', kind === 'doctors' ? 'Withdrawn' : 'Inactive'], ['draft', 'Draft'],
  ['incomplete', 'Incomplete'], ['approved', 'Approved'], ['expired', 'Review expired'],
  ['withdrawn', 'Review withdrawn'], ['ready', 'Ready to approve'],
];
const directoryPageSizes = { hospitals: 20, doctors: 20, 'blood-banks': 25, articles: 25 };
function directoryPageSizeSelector(kind, onChange) {
  const select = el('select');
  select.setAttribute('aria-label', 'Records per page');
  const defaultSize = kind === 'blood-banks' || kind === 'articles' ? 25 : 20;
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
  const options = kind === 'articles'
    ? [['all', 'All articles'], ['draft', 'Draft'], ['published', 'Published']]
    : directoryStatusOptions(kind);
  for (const [key, label] of options) { const option = el('option', label); option.value = key; select.append(option); }
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
  wrap.append(metrics, el('p', 'Counts include all matching pages. A record can appear in more than one status.'));
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
let activeApproval = null;
let updateBulkSelection = null;

function approvalActivity(job) {
  const panel = $('approval-activity');
  if (authEpoch !== job.epoch) return;
  panel.hidden = false;
  $('approval-title').textContent = job.title;
  $('approval-count').textContent = `${number(job.processed)} of ${number(job.total)} processed`;
  $('approval-progress').max = job.total;
  $('approval-progress').value = job.processed;
  $('approval-outcome').textContent = job.message || `${number(job.approved)} ${job.verb} · ${number(job.failed)} not ${job.verb}`;
  if (job.finished || job.processed === 0) {
    $('approval-announcement').textContent = job.finished
      ? `${job.title}. ${$('approval-count').textContent}. ${$('approval-outcome').textContent}`
      : `${job.title} started. ${number(job.total)} selected.`;
  }
  $('dismiss-approval').hidden = !job.finished;
  panel.classList.toggle('approval-error', Boolean(job.message));
}

async function streamApproval(kind, items, onProgress) {
  const response = await api(`/admin/directory-approvals/${kind}`, {
    method: 'POST',
    headers: { Accept: 'application/x-ndjson' },
    body: JSON.stringify({ items }),
    stream: true,
  });
  if (!response.headers?.get('Content-Type')?.includes('application/x-ndjson')) return response.json();
  if (!response.body) throw new Error('The approval results could not be read.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', complete;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line) continue;
        const event = JSON.parse(line);
        if (event.type === 'progress') onProgress(event);
        if (event.type === 'complete') complete = event;
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!complete) throw new Error('The connection closed before the final approval results arrived.');
  return complete;
}

function directoryBulkApproval(kind, reload) {
  const articles = kind === 'articles', verb = articles ? 'published' : 'approved';
  const selected = new Map(), boxes = [], section = el('div', null, 'directory-bulk');
  const caption = el('span', '0 selected'), all = el('input'); all.type = 'checkbox';
  const label = el('label', null, 'check');
  label.append(all, document.createTextNode(articles ? 'Select all drafts on this page' : 'Select all eligible records on this page'));
  let eligibleCount = 0;

  async function approveRecords(rows) {
    if (!rows.length || activeApproval?.epoch === authEpoch) return;
    const epoch = authEpoch, revision = requestRevision;
    const items = rows.map(row => articles || kind === 'blood-banks'
      ? { id: row.id, expectedUpdatedAt: row.updated_at }
      : { id: row.id, expectedVersion: row.version });
    const title = { hospitals: 'Hospital approval', doctors: 'Doctor approval', 'blood-banks': 'Blood bank approval', articles: 'Article publishing' }[kind];
    const job = { epoch, title, verb, total: items.length, processed: 0, approved: 0, failed: 0, finished: false };
    activeApproval = job;
    update();
    approvalActivity(job);
    try {
      const result = await streamApproval(kind, items, ({ processed, approved, failed }) => {
        Object.assign(job, { processed, approved, failed });
        approvalActivity(job);
      });
      if (authEpoch !== epoch) return;
      Object.assign(job, { processed: items.length, approved: result.approved, failed: result.failed, receivedResult: true });
      directoryApprovalResults.set(kind, { epoch, result });
      if (requestRevision === revision) await reload();
      else if (page === kind) await show();
    } catch (error) {
      if (authEpoch !== epoch) return;
      job.message = job.receivedResult
        ? `Could not refresh the list. ${error.message}`
        : `${error.message} Refresh the list to check which records were ${verb} before retrying.`;
    } finally {
      job.finished = true;
      if (activeApproval === job) activeApproval = null;
      approvalActivity(job);
      updateBulkSelection?.();
    }
  }

  const approve = button(articles ? 'Publish selected' : 'Approve selected', () => approveRecords([...selected.values()]), 'primary');
  function update() {
    const pending = activeApproval?.epoch === authEpoch;
    section.setAttribute('aria-busy', String(pending));
    caption.textContent = `${selected.size} selected`;
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
  updateBulkSelection = update;
  update();
  section.append(label, caption, approve);
  const prior = directoryApprovalResults.get(kind);
  const results = el('div', null, 'directory-approval-results');
  if (prior?.epoch === authEpoch) {
    const details = el('details');
    details.append(
      el('summary', `${articles ? 'Last publish' : 'Last approval'} · ${number(prior.result.approved)} ${verb}. ${number(prior.result.failed)} not ${verb}.`),
      table(['Record', 'Result', 'Details'], prior.result.results.map(row => [row.name, row.status === 'approved' ? (articles ? 'Published' : 'Approved') : `Not ${verb}`, row.message])),
    );
    results.append(details);
  }
  return { section, results, checkbox: row => {
    const input = el('input'); input.type = 'checkbox';
    const eligible = articles ? !row.is_published : row.adminStatus?.active !== false;
    input.disabled = !eligible || activeApproval?.epoch === authEpoch;
    if (eligible) {
      eligibleCount++;
      all.disabled = activeApproval?.epoch === authEpoch;
    }
    input.setAttribute('aria-label', `Select ${articles ? row.title_en : row.name_en}${eligible ? '' : articles ? ' (published)' : ' (inactive)'}`);
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
