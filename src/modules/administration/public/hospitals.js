/* Structured hospitals use the existing care identity. Directory visibility and source-review status are separate. */
const hospitalFlags = [
  'accepts_ayushman',
  'accepts_janaadhaar',
  'accepts_cghs',
  'accepts_esic',
  'rgahs_approved',
  'is_cashless',
  'nabh_accredited',
  'is_24_7',
];
const hospitalGroups = [
  ['Identity', ['name_en', 'name_hi', 'hospital_type']],
  [
    'Location',
    [
      'address_line1',
      'address_line2',
      'landmark',
      'address_hi',
      'city',
      'state',
      'pincode',
      'latitude',
      'longitude',
    ],
  ],
  [
    'Contacts and sources',
    ['country_code_1', 'phone_1', 'country_code_2', 'phone_2', 'email', 'website', 'source_url'],
  ],
  ['Hospital information', ['summary_en', 'summary_hi', 'specialties', 'cashless_schemes']],
];
const hospitalLabel = (key) =>
  ({
    name_en: 'English name',
    name_hi: 'Hindi name',
    hospital_type: 'Hospital type',
    address_line1: 'Address line 1',
    address_line2: 'Address line 2',
    address_hi: 'Hindi address',
    country_code_1: 'Primary country code',
    country_code_2: 'Secondary country code',
    phone_1: 'Primary phone',
    phone_2: 'Secondary phone',
    source_url: 'Source evidence URL',
    summary_en: 'English summary',
    summary_hi: 'Hindi summary',
    cashless_schemes: 'Cashless schemes (semicolon-separated)',
    specialties: 'Specialties (semicolon-separated)',
    accepts_ayushman: 'Ayushman accepted',
    accepts_janaadhaar: 'Jan Aadhaar accepted',
    accepts_cghs: 'CGHS accepted',
    accepts_esic: 'ESIC accepted',
    rgahs_approved: 'RGHS approved',
    is_cashless: 'Cashless facility',
    nabh_accredited: 'NABH accreditation',
    is_24_7: 'Open 24/7',
  })[key] || key.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

async function hospitalsPage(current = 1, term = '', city = '', status = 'all') {
  reset('Hospitals');
  const rev = requestRevision,
    section = panel(),
    tools = el('form', null, 'toolbar directory-index-tools');
  const search = el('input');
  search.type = 'search';
  search.value = term;
  search.placeholder = 'Search English or Hindi name, area or city';
  search.setAttribute('aria-label', search.placeholder);
  const location = el('input');
  location.value = city;
  location.placeholder = 'City (all locations if empty)';
  location.setAttribute('aria-label', 'Filter hospital city');
  const filter = directoryStatusFilter('hospitals', status, next => hospitalsPage(1, search.value.trim(), location.value.trim(), next));
  const searchButton = el('button', 'Search');
  searchButton.type = 'submit';
  tools.addEventListener('submit', (event) => {
    event.preventDefault();
    void safely(() => hospitalsPage(1, search.value.trim(), location.value.trim(), filter.value));
  });
  tools.append(
    search,
    location,
    filter,
    searchButton,
    button('Add hospital', () => hospitalEditor()),
  );
  section.append(tools);
  content.append(section);
  const importer = panel('Import hospitals'),
    file = el('input'),
    review = el('div');
  file.type = 'file';
  file.accept = '.csv,.xlsx';
  file.setAttribute('aria-label', 'Hospital CSV or XLSX file');
  let fileRevision = 0;
  file.addEventListener('change', () => {
    fileRevision++;
    review.replaceChildren();
  });
  for (const format of ['xlsx', 'csv'])
    importer.append(
      button(`Download ${format.toUpperCase()} template`, async () => {
        const blob = await api(`/admin/hospitals/template?format=${format}`, { blob: true });
        if (rev !== requestRevision) return;
        const url = URL.createObjectURL(blob),
          link = el('a');
        link.href = url;
        link.download = `hospitals-template.${format}`;
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
    review.replaceChildren(el('p', 'Validating hospital records…'));
    try {
      const body = new FormData();
      body.append('file', selected);
      const data = await api('/admin/hospitals/import/preview', { method: 'POST', body });
      if (rev !== requestRevision || selectedRevision !== fileRevision) return;
      review.replaceChildren(
        el(
          'p',
          `${data.totalRows} rows · ${data.creates} new · ${data.updates} updates · ${data.errorCount} errors`,
        ),
        el(
          'p',
          `Imported hospitals appear as directory listings; source review is a separate status. ${data.returnsToDraft} currently published records would return to draft. ${data.ignoredVerificationFlags} legacy verification flags will not be used to publish records.`,
        ),
      );
      for (const error of data.errors)
        review.append(el('p', `Row ${error.row}: ${error.message}`, 'error'));
      if (data.sample.length)
        review.append(
          table(
            ['Source key', 'Name', 'City', 'State'],
            data.sample.map((row) => [row.source_key, row.name_en, row.city, row.state]),
          ),
        );
      if (data.previewToken) {
        const apply = button(
          `Apply ${data.totalRows} hospitals`,
          async () => {
            if (selectedRevision !== fileRevision) throw new Error('File changed. Preview again.');
            apply.disabled = true;
            preview.disabled = true;
            file.disabled = true;
            try {
              const payload = new FormData();
              payload.append('file', selected);
              payload.append('previewToken', data.previewToken);
              await api('/admin/hospitals/import/apply', { method: 'POST', body: payload });
              if (rev === requestRevision) await hospitalsPage(current, term, city, status);
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
        review.append(
          el('p', 'Preview expires in 10 minutes. Changed records or files need a new preview.'),
          apply,
        );
      }
    } finally {
      preview.disabled = false;
    }
  });
  importer.append(
    el(
      'p',
      'Match records by source_key. Supported SwasthyaSearch CSV IDs become swasthya:hospital:<id>. City and state are required. Leave unknown scheme eligibility blank. No doctors or affiliations are created.',
    ),
    file,
    preview,
    review,
  );
  content.append(importer);
  const data = await api(
    `/admin/hospitals?page=${current}&search=${encodeURIComponent(term)}&city=${encodeURIComponent(city)}&status=${status}`,
  );
  if (rev !== requestRevision) return;
  section.append(directorySummary('hospitals', data.summary, next => hospitalsPage(1, term, city, next)));
  const bulk = directoryBulkApproval('hospitals', () => hospitalsPage(current, term, city, status));
  section.append(bulk.section, bulk.results);
  section.append(
    table(
      ['Select', 'Hospital', 'Location', 'Type', 'Status', 'Completeness', 'Review date', 'Actions'],
      data.items.map((row) => {
        const actions = el('div', null, 'actions');
        actions.append(
          button('Edit', () => hospitalEditor(row.id)),
          button('Image', () => providerImageEditor('hospitals', row.id)),
          button('Source review', () => hospitalReviewEditor(row.id)),
          button(row.listed ? 'Hide from app' : 'Show in app', async () => { await api(`/admin/hospitals/${row.id}/visibility`, { method: 'POST', body: { listed: !row.listed, expectedVersion: row.version } }); await hospitalsPage(current, term, city, status); }),
          button('Delete', () =>
            openEditor(
              'Delete hospital?',
              [],
              async () => {
                await api(`/admin/hospitals/${row.id}?expected_version=${row.version}`, {
                  method: 'DELETE',
                });
                await hospitalsPage(current, term, city, status);
              },
              'Removes the hospital and its shared care projection. Linked records prevent deletion; withdraw publication instead.',
            ),
          ),
        );
        return [
          bulk.checkbox(row),
          row.name_en,
          [row.city, row.state].join(', '),
          row.hospital_type || 'Not added',
          directoryStatusCell(row),
          directoryCompletenessCell(row),
          date(row.reviewedAt),
          actions,
        ];
      }),
    ),
  );
  section.append(
    el(
      'p',
      `${data.total} matching hospitals. Listed hospitals appear in the app. Source review is shown separately; use Hide from app to remove a listing.`,
    ),
  );
  pager(section, current, data.hasNext, (next) => hospitalsPage(next, term, city, status));
}

async function hospitalEditor(id) {
  const rev = requestRevision,
    row = id ? await api(`/admin/hospitals/${id}`) : {};
  if (rev !== requestRevision) return;
  const fields = [];
  if (!id) fields.push(field('source_key', 'Permanent source key'));
  for (const [title, keys] of hospitalGroups) {
    fields.push(el('h3', title));
    const group = el('div', null, 'field-row');
    for (const key of keys) {
      const value = Array.isArray(row[key]) ? row[key].join('; ') : row[key];
      group.append(
        field(
          key,
          hospitalLabel(key),
          value,
          /summary|address_line|address_hi/.test(key)
            ? 'textarea'
            : /latitude|longitude/.test(key)
              ? 'number'
              : 'text',
        ),
      );
    }
    fields.push(group);
  }
  fields.push(el('h3', 'Scheme eligibility and facilities'));
  const benefits = el('div', null, 'field-row');
  for (const key of hospitalFlags)
    benefits.append(
      field(
        key,
        hospitalLabel(key),
        row[key] === true ? 'true' : row[key] === false ? 'false' : '',
        'text',
        [
          ['', 'Unknown'],
          ['true', 'Yes'],
          ['false', 'No'],
        ],
      ),
    );
  fields.push(benefits);
  openEditor(
    id ? 'Edit hospital' : 'Add hospital',
    fields,
    async (data) => {
      const body = {};
      for (const [, keys] of hospitalGroups)
        for (const key of keys) {
          const text = String(data.get(key) ?? '').trim();
          body[key] = ['latitude', 'longitude'].includes(key)
            ? text
              ? Number(text)
              : null
            : ['cashless_schemes', 'specialties'].includes(key)
              ? text
                  .split(';')
                  .map((value) => value.trim())
                  .filter(Boolean)
              : ['phone_1', 'phone_2', 'email', 'website', 'source_url'].includes(key)
                ? text || null
                : text;
        }
      for (const key of hospitalFlags)
        body[key] = data.get(key) === 'true' ? true : data.get(key) === 'false' ? false : null;
      if (id) body.expectedVersion = row.version;
      else body.source_key = String(data.get('source_key') ?? '').trim();
      await send(id ? `/admin/hospitals/${id}` : '/admin/hospitals', body, id ? 'PATCH' : 'POST');
      await hospitalsPage();
    },
    `Every save returns this hospital to draft for source review. Supply a country code unless the phone number already starts with +.${id ? ' Source key: ' + row.source_key : ''}`,
  );
  for (const key of ['source_key', 'name_en', 'city', 'state']) {
    const input = $('editor-fields').querySelector(`[name=${key}]`);
    if (input) input.required = true;
  }
}

async function hospitalReviewEditor(id) {
  const rev = requestRevision,
    row = await api(`/admin/hospitals/${id}`);
  if (rev !== requestRevision) return;
  openEditor(
    'Hospital source review',
    [
      field('reviewerName', 'Reviewer name'),
      field('reviewerQualification', 'Reviewer role / qualification'),
      field('evidence', 'Source review evidence', '', 'textarea'),
      field('confirmedSource', 'I checked the source, address and contacts', false, 'checkbox'),
      field('publish', 'Publish after review', true, 'checkbox'),
    ],
    async (data) => {
      await send(`/admin/hospitals/${id}/review`, {
        expectedVersion: row.version,
        reviewerName: data.get('reviewerName'),
        reviewerQualification: data.get('reviewerQualification'),
        evidence: data.get('evidence'),
        confirmedSource: data.has('confirmedSource'),
        publish: data.has('publish'),
      });
      await hospitalsPage();
    },
    `${row.name_en} · ${row.city}, ${row.state}. Source: ${row.source_url || 'Missing — edit before publishing'}. Review covers the supplied facility and eligibility information; it does not establish live beds or appointment availability.`,
  );
}
