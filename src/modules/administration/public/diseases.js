/* Department data is rendered only as text. Server enforces all permissions and preview checks. */
async function diseasesPage(current = 1, term = '', status = 'all') {
  reset('Diseases');
  const rev = requestRevision,
    section = panel(),
    tools = el('form', null, 'toolbar');
  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Search English or Hindi names';
  search.value = term;
  search.setAttribute('aria-label', search.placeholder);
  const filter = el('select');
  filter.setAttribute('aria-label', 'Department visibility');
  for (const [value, label] of [
    ['all', 'All diseases'],
    ['active', 'Active'],
    ['inactive', 'Inactive'],
  ]) {
    const option = el('option', label);
    option.value = value;
    filter.append(option);
  }
  filter.value = status;
  const submit = el('button', 'Search');
  submit.type = 'submit';
  tools.addEventListener('submit', (event) => {
    event.preventDefault();
    void safely(() => diseasesPage(1, search.value.trim(), filter.value));
  });
  filter.addEventListener(
    'change',
    () => void safely(() => diseasesPage(1, search.value.trim(), filter.value)),
  );
  tools.append(
    search,
    filter,
    submit,
    button('Add disease', () => diseaseEditor()),
  );
  section.append(tools);
  content.append(section);
  const uploader = panel('Import diseases'),
    file = el('input'),
    review = el('div');
  file.type = 'file';
  file.accept = '.csv,.xlsx';
  file.setAttribute('aria-label', 'Department CSV or Excel file');
  let fileRevision = 0;
  file.addEventListener('change', () => {
    fileRevision++;
    review.replaceChildren();
  });
  for (const format of ['xlsx', 'csv'])
    uploader.append(
      button(`Download ${format.toUpperCase()} template`, async () => {
        const blob = await api(`/admin/diseases/template?format=${format}`, { blob: true });
        if (rev !== requestRevision) return;
        const url = URL.createObjectURL(blob),
          link = el('a');
        link.href = url;
        link.download = `medical-diseases-template.${format}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
    );
  const preview = button('Preview import', async () => {
    const selected = file.files[0],
      selectedRevision = fileRevision;
    if (!selected || selected.size > 8 * 1024 * 1024)
      throw new Error('Choose a CSV or XLSX file up to 8 MB.');
    preview.disabled = true;
    review.replaceChildren(el('p', 'Validating diseases…'));
    try {
      const body = new FormData();
      body.append('file', selected);
      const data = await api('/admin/diseases/import/preview', { method: 'POST', body });
      if (rev !== requestRevision || selectedRevision !== fileRevision) return;
      review.replaceChildren(
        el(
          'p',
          `${data.totalRows} rows · ${data.creates} new · ${data.updates} updates · ${data.activeRows} active · ${data.errorCount} errors`,
        ),
      );
      for (const error of data.errors)
        review.append(el('p', `Row ${error.row}: ${error.message}`, 'error'));
      if (data.sample.length)
        review.append(
          table(
            ['Record key', 'English', 'Hindi', 'Visibility'],
            data.sample.map((row) => [
              row.record_key,
              row.name_en,
              row.name_hi,
              row.is_active ? 'Active' : 'Inactive',
            ]),
          ),
        );
      if (data.previewToken) {
        review.append(
          el(
            'p',
            'Preview expires in 10 minutes. Any file or disease change requires a new preview.',
          ),
        );
        const apply = button(
          `Apply ${data.totalRows} diseases`,
          async () => {
            if (fileRevision !== selectedRevision)
              throw new Error('The file changed. Preview it again.');
            apply.disabled = true;
            file.disabled = true;
            preview.disabled = true;
            try {
              const payload = new FormData();
              payload.append('file', selected);
              payload.append('previewToken', data.previewToken);
              await api('/admin/diseases/import/apply', { method: 'POST', body: payload });
              if (rev === requestRevision) await diseasesPage(current, term, status);
            } catch (error) {
              review.replaceChildren(el('p', error.message, 'error'));
              throw error;
            } finally {
              file.disabled = false;
              preview.disabled = false;
            }
          },
          'primary',
        );
        review.append(apply);
      }
    } finally {
      preview.disabled = false;
    }
  });
  uploader.append(
    el(
      'p',
      'Match existing records by record_key. Legacy numeric id is accepted as swasthya:disease:<id>. Blank is_active stays inactive. Departments must exist already. No doctors or symptoms are created.',
    ),
    file,
    preview,
    review,
  );
  content.append(uploader);
  const data = await api(
    `/admin/diseases?page=${current}&search=${encodeURIComponent(term)}&status=${status}`,
  );
  if (rev !== requestRevision) return;
  section.append(
    table(
      ['English name', 'Hindi name', 'Department', 'Record key', 'Visibility', 'Actions'],
      data.items.map((row) => {
        const actions = el('div', null, 'actions');
        actions.append(
          button('Edit', () => diseaseEditor(row.id)),
          button('Delete', () =>
            openEditor(
              'Delete disease?',
              [],
              async () => {
                await api(`/admin/diseases/${row.id}?expected_version=${row.version}`, {
                  method: 'DELETE',
                });
                await diseasesPage(current, term, status);
              },
              'Permanently removes this disease. Deactivate it instead if you want to keep it for later.',
            ),
          ),
        );
        return [
          row.name_en,
          row.name_hi,
          row.department?.name_en || 'Unavailable',
          row.record_key,
          row.is_active ? 'Active' : 'Inactive',
          actions,
        ];
      }),
    ),
  );
  section.append(
    el(
      'p',
      `${data.total} matching diseases. Public APIs show active diseases linked to active departments.`,
    ),
  );
  pager(section, current, data.hasNext, (page) => diseasesPage(page, term, status));
}

async function diseaseEditor(id) {
  const rev = requestRevision,
    row = id ? await api(`/admin/diseases/${id}`) : {};
  if (rev !== requestRevision) return;
  const masters = [];
  for (let page = 1; ; page++) {
    const response = await api(`/admin/departments?limit=100&page=${page}`);
    if (rev !== requestRevision) return;
    masters.push(...response.items);
    if (!response.hasNext || !response.items.length) break;
  }
  if (!masters.length) throw new Error('Create or import a medical department first.');
  const fields = [
    field(
      'department_id',
      'Medical department',
      row.department_id || masters[0].id,
      'text',
      masters.map((item) => [item.id, item.name_en + (item.is_active ? '' : ' (inactive)')]),
    ),
  ];
  fields.push(
    field('name_en', 'English name', row.name_en),
    field('name_hi', 'Hindi name', row.name_hi),
    field('description_en', 'English description', row.description_en, 'textarea'),
    field('description_hi', 'Hindi description', row.description_hi, 'textarea'),
    field('is_active', 'Active in public library', row.is_active, 'checkbox'),
  );
  openEditor(
    id ? 'Edit disease' : 'Add disease',
    fields,
    async (data) => {
      const body = {
        department_id: data.get('department_id'),
        name_en: data.get('name_en'),
        name_hi: data.get('name_hi'),
        description_en: data.get('description_en'),
        description_hi: data.get('description_hi'),
        is_active: data.has('is_active'),
      };
      if (id) body.expectedVersion = row.version;
      await send(id ? `/admin/diseases/${id}` : '/admin/diseases', body, id ? 'PATCH' : 'POST');
      await diseasesPage();
    },
    id
      ? `Record key: ${row.record_key}. Reload if another administrator changes this record.`
      : 'A record ID is assigned automatically.',
  );
  for (const name of ['name_en']) {
    const input = $('editor-fields').querySelector(`[name=${name}]`);
    if (input) input.required = true;
  }
}
