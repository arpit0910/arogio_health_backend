const departmentCatalog = {
  endpoint: '/admin/departments',
  title: 'Medical departments',
  singular: 'department',
  plural: 'departments',
  editor: departmentEditor,
};

function departmentsPage(current = 1, term = '', status = 'all') {
  return taxonomyPage(departmentCatalog, { current, term, status });
}

async function taxonomyDepartments(revision) {
  const departments = [];
  for (let page = 1; ; page++) {
    const response = await api(`/admin/departments?limit=100&page=${page}`);
    if (revision !== requestRevision) return null;
    departments.push(...response.items);
    if (!response.hasNext || !response.items.length) return departments;
  }
}

async function taxonomyPage(catalog, { current, term, status, departmentId = '' }) {
  rememberDirectoryView(catalog.plural, { current, term, status, departmentId });
  reset(catalog.title);
  const revision = requestRevision;
  const reload = (currentPage = current) => taxonomyPage(catalog, { current: currentPage, term, status, departmentId });
  const section = panel();
  section.classList.add('taxonomy-catalog');
  const heading = el('div', null, 'section-head');
  heading.append(el('h2', 'Catalog'), button(`Add ${catalog.singular}`, () => catalog.editor(undefined, reload), 'primary'));
  const tools = el('form', null, 'toolbar');
  tools.setAttribute('aria-label', `Search ${catalog.plural}`);
  const search = el('input');
  search.type = 'search';
  search.maxLength = 150;
  search.placeholder = 'Search names or descriptions';
  search.value = term;
  const searchLabel = el('label', 'Search');
  searchLabel.append(search);
  const visibility = field('status', 'Visibility', status, 'text', [
    ['all', 'All statuses'], ['active', 'Active'], ['inactive', 'Inactive'],
  ]);
  const department = catalog.byDepartment
    ? field('department_id', 'Department', '', 'text', [['', 'All departments']])
    : null;
  const departmentSelect = department?.querySelector('select');
  if (departmentSelect) {
    departmentSelect.disabled = true;
    void taxonomyDepartments(revision).then(items => {
      if (!items || revision !== requestRevision) return;
      for (const item of items) {
        const option = el('option', item.name_en);
        option.value = item.id;
        departmentSelect.append(option);
      }
      departmentSelect.value = departmentId;
      departmentSelect.disabled = false;
    }).catch(() => {
      if (revision === requestRevision) departmentSelect.options[0].textContent = 'Departments unavailable';
    });
  }
  const submit = el('button', 'Search');
  submit.type = 'submit';
  const searchWithFilters = () => taxonomyPage(catalog, {
    current: 1, term: search.value.trim(), status: visibility.querySelector('select').value,
    departmentId: departmentSelect?.disabled ? departmentId : departmentSelect?.value,
  });
  tools.addEventListener('submit', event => {
    event.preventDefault();
    void safely(searchWithFilters);
  });
  tools.append(searchLabel, visibility);
  if (department) tools.append(department);
  tools.append(submit);
  const results = el('div');
  results.setAttribute('aria-busy', 'true');
  const message = el('p', `Loading ${catalog.plural}…`);
  message.setAttribute('role', 'status');
  results.append(message);
  section.append(heading, tools, results);
  content.append(section, taxonomyImport(catalog, revision, reload));

  const query = new URLSearchParams({ page: current, search: term, status });
  if (departmentId) query.set('department_id', departmentId);
  let data;
  try {
    data = await api(`${catalog.endpoint}?${query}`);
  } catch (error) {
    if (revision !== requestRevision) return;
    results.setAttribute('aria-busy', 'false');
    const alert = el('p', error.message, 'notice error');
    alert.setAttribute('role', 'alert');
    results.replaceChildren(alert, button('Retry', () => reload()));
    return;
  }
  if (revision !== requestRevision) return;
  if (current > 1 && !data.items.length) return reload(Math.min(current - 1, Math.max(1, Math.ceil(data.total / 30))));
  results.setAttribute('aria-busy', 'false');
  const summary = el('p', `${data.total} matching ${catalog.plural}`, 'taxonomy-result-count');
  summary.setAttribute('role', 'status');
  results.replaceChildren(summary);
  if (!data.items.length) {
    const filtered = term || status !== 'all' || departmentId;
    results.append(el('p', filtered
      ? 'No records match this search. Change or clear the filters.'
      : `Add a ${catalog.singular} or import a CSV or Excel file to get started.`, 'empty'));
    if (filtered) results.append(button('Clear filters', () => taxonomyPage(catalog, { current: 1, term: '', status: 'all' })));
    return;
  }
  const headers = ['Name', ...(catalog.byDepartment ? ['Medical department'] : []), 'Visibility', 'Actions'];
  const listings = table(headers, data.items.map(row => {
    const name = el('div', null, 'taxonomy-name');
    name.append(el('strong', row.name_en));
    if (row.name_hi) {
      const translation = el('span', row.name_hi);
      translation.lang = 'hi';
      name.append(translation);
    }
    const visible = row.is_active && (!catalog.byDepartment || row.department?.is_active);
    const visibility = el('div', null, 'directory-status');
    visibility.append(el('span', visible ? 'Active' : row.is_active ? 'Hidden' : 'Inactive', `status-label status-${visible ? 'active' : 'inactive'}`));
    if (row.is_active && !visible) visibility.append(el('small', 'Department inactive'));
    const actions = el('div', null, 'actions');
    const edit = button('Edit', () => catalog.editor(row.id, reload));
    edit.setAttribute('aria-label', `Edit ${row.name_en}`);
    const toggle = button(row.is_active ? 'Deactivate' : 'Activate', async () => {
      toggle.disabled = true;
      try {
        await send(`${catalog.endpoint}/${row.id}`, { is_active: !row.is_active, expectedVersion: row.version }, 'PATCH');
        if (revision === requestRevision) await reload();
      } finally { toggle.disabled = false; }
    });
    toggle.setAttribute('aria-label', `${toggle.textContent} ${row.name_en}`);
    actions.append(edit, toggle, button('Delete', () => openEditor(
      `Delete ${catalog.singular}?`, [],
      async () => {
        await api(`${catalog.endpoint}/${row.id}?expected_version=${row.version}`, { method: 'DELETE' });
        if (revision === requestRevision) await reload();
      },
      `Permanently removes ${row.name_en}. Deactivate it to keep the record for later.`,
    )));
    return [name, ...(catalog.byDepartment ? [row.department?.name_en ?? 'Unavailable'] : []), visibility, actions];
  }));
  listings.tabIndex = 0;
  listings.setAttribute('role', 'region');
  listings.setAttribute('aria-label', catalog.title);
  for (const [selector, role] of [['table', 'table'], ['thead, tbody', 'rowgroup'], ['tr', 'row'], ['th', 'columnheader'], ['td', 'cell']]) {
    for (const node of listings.querySelectorAll(selector)) node.setAttribute('role', role);
  }
  results.append(listings);
  pager(results, current, data.hasNext, reload);
}

function taxonomyImport(catalog, revision, reload) {
  const section = el('details', null, 'panel taxonomy-import');
  section.append(el('summary', `Import ${catalog.plural}`));
  const instructions = el('p', catalog.byDepartment
    ? 'Create the medical departments first. Use the same record key when updating an existing disease.'
    : 'Use the same record key when updating an existing department.');
  const tools = el('div', null, 'toolbar');
  for (const format of ['xlsx', 'csv']) {
    tools.append(button(`Download ${format.toUpperCase()} template`, async () => {
      const blob = await api(`${catalog.endpoint}/template?format=${format}`, { blob: true });
      if (revision !== requestRevision) return;
      const url = URL.createObjectURL(blob);
      const link = el('a');
      link.href = url;
      link.download = `medical-${catalog.plural}-template.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }));
  }
  const file = el('input');
  file.type = 'file';
  file.accept = '.csv,.xlsx';
  file.setAttribute('aria-label', `Upload ${catalog.plural} as CSV or Excel`);
  const review = el('div');
  review.setAttribute('aria-live', 'polite');
  let fileRevision = 0;
  file.addEventListener('change', () => {
    fileRevision++;
    review.replaceChildren();
  });
  const preview = button('Preview import', async () => {
    const selected = file.files[0];
    const selectedRevision = fileRevision;
    if (!selected || selected.size > 8 * 1024 * 1024) throw new Error('Choose a CSV or XLSX file up to 8 MB.');
    preview.disabled = true;
    review.replaceChildren(el('p', `Validating ${catalog.plural}…`));
    try {
      const body = new FormData();
      body.append('file', selected);
      const data = await api(`${catalog.endpoint}/import/preview`, { method: 'POST', body });
      if (revision !== requestRevision || selectedRevision !== fileRevision) return;
      review.replaceChildren(el('p', `${data.totalRows} rows · ${data.creates} new · ${data.updates} updates · ${data.activeRows} active · ${data.errorCount} errors`));
      for (const error of data.errors) review.append(el('p', `Row ${error.row} · ${error.message}`, 'error'));
      if (data.sample.length) review.append(table(
        ['Record key', 'English name', 'Hindi name', ...(catalog.byDepartment ? ['Medical department'] : []), 'Visibility'],
        data.sample.map(row => [row.record_key, row.name_en, row.name_hi || '—',
          ...(catalog.byDepartment ? [row.department_name_en || '—'] : []), row.is_active ? 'Active' : 'Inactive']),
      ));
      if (data.previewToken) {
        const apply = button(`Apply ${data.totalRows} ${catalog.plural}`, async () => {
          if (fileRevision !== selectedRevision) throw new Error('The file changed. Preview it again.');
          apply.disabled = file.disabled = preview.disabled = true;
          apply.textContent = 'Applying import…';
          try {
            body.append('previewToken', data.previewToken);
            await api(`${catalog.endpoint}/import/apply`, { method: 'POST', body });
            if (revision === requestRevision) {
              await reload(1);
              $('message').className = 'notice';
              $('message').textContent = `Imported ${data.totalRows} ${catalog.plural}.`;
            }
          } catch (error) {
            if (revision === requestRevision) review.replaceChildren(el('p', error.message, 'error'));
          } finally { file.disabled = preview.disabled = false; }
        }, 'primary');
        review.append(el('p', 'Apply within 10 minutes. Preview again if the file or catalog changes.'), apply);
      }
    } catch (error) {
      if (revision === requestRevision && selectedRevision === fileRevision)
        review.replaceChildren(el('p', error.message, 'error'));
    } finally { preview.disabled = false; }
  });
  tools.append(file, preview);
  section.append(instructions, tools, review);
  return section;
}

function taxonomyFields(row) {
  const english = field('name_en', 'English name (required)', row.name_en);
  english.querySelector('input').required = true;
  return [
    english,
    field('name_hi', 'Hindi name', row.name_hi),
    field('description_en', 'English description', row.description_en, 'textarea'),
    field('description_hi', 'Hindi description', row.description_hi, 'textarea'),
    field('is_active', 'Active in public catalog', row.is_active, 'checkbox'),
  ];
}

async function saveTaxonomyRecord(catalog, row, data, reload, extra = {}) {
  const body = {
    name_en: data.get('name_en'),
    name_hi: data.get('name_hi'),
    description_en: data.get('description_en'),
    description_hi: data.get('description_hi'),
    is_active: data.has('is_active'),
    ...extra,
  };
  if (row.id) body.expectedVersion = row.version;
  await send(row.id ? `${catalog.endpoint}/${row.id}` : catalog.endpoint, body, row.id ? 'PATCH' : 'POST');
  await reload();
}

async function departmentEditor(id, reload = departmentsPage) {
  const revision = requestRevision;
  const row = id ? await api(`/admin/departments/${id}`) : {};
  if (revision !== requestRevision) return;
  openEditor(id ? 'Edit medical department' : 'Add medical department', taxonomyFields(row),
    data => saveTaxonomyRecord(departmentCatalog, row, data, reload),
    id ? `Record key · ${row.record_key}` : 'Active departments are available in the public directory.');
}
