/* Structured doctors use the existing care identity. All imported rows remain drafts. */
const doctorGroups = [
  [
    'Identity',
    [
      'name_en',
      'name_hi',
      'registration_number',
      'medical_council',
      'qualifications',
      'experience_years',
      'consultation_fee',
      'languages',
    ],
  ],
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
  ['Profile', ['summary_en', 'summary_hi']],
];
const doctorLabel = (key) =>
  ({
    name_en: 'English name',
    name_hi: 'Hindi name',
    registration_number: 'Medical registration number',
    qualifications: 'Qualifications (semicolon-separated)',
    languages: 'Languages (semicolon-separated)',
    consultation_fee: 'Consultation fee (INR)',
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
  })[key] || key.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

async function doctorsPage(current = 1, term = '', city = '', status = 'all') {
  rememberDirectoryView('doctors', { current, term, city, status, size: directoryPageSizes.doctors });
  reset('Doctors');
  const rev = requestRevision,
    section = panel(),
    tools = el('form', null, 'toolbar directory-index-tools');
  section.classList.add('doctors-management');
  const search = el('input');
  search.type = 'search';
  search.value = term;
  search.placeholder = 'Search English or Hindi name, area or city';
  search.setAttribute('aria-label', search.placeholder);
  const location = el('input');
  location.value = city;
  location.placeholder = 'City (all locations if empty)';
  location.setAttribute('aria-label', 'Filter doctor city');
  const filter = directoryStatusFilter('doctors', status, next => doctorsPage(1, search.value.trim(), location.value.trim(), next));
  const searchButton = el('button', 'Search');
  searchButton.type = 'submit';
  tools.addEventListener('submit', (event) => {
    event.preventDefault();
    void safely(() => doctorsPage(1, search.value.trim(), location.value.trim(), filter.value));
  });
  tools.append(
    search,
    location,
    filter,
    directoryPageSizeSelector('doctors', () => doctorsPage(1, search.value.trim(), location.value.trim(), filter.value)),
    searchButton,
    button('Add doctor', () => doctorEditor()),
  );
  section.append(tools);
  content.append(section);
  const importer = panel('Import doctors'),
    file = el('input'),
    review = el('div');
  file.type = 'file';
  file.accept = '.csv,.xlsx';
  file.setAttribute('aria-label', 'Doctor CSV or XLSX file');
  let fileRevision = 0;
  file.addEventListener('change', () => {
    fileRevision++;
    review.replaceChildren();
  });
  for (const format of ['xlsx', 'csv'])
    importer.append(
      button(`Download ${format.toUpperCase()} template`, async () => {
        const blob = await api(`/admin/doctors/template?format=${format}`, { blob: true });
        if (rev !== requestRevision) return;
        const url = URL.createObjectURL(blob),
          link = el('a');
        link.href = url;
        link.download = `doctors-template.${format}`;
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
    review.replaceChildren(el('p', 'Validating doctor records…'));
    try {
      const body = new FormData();
      body.append('file', selected);
      const data = await api('/admin/doctors/import/preview', { method: 'POST', body });
      if (rev !== requestRevision || selectedRevision !== fileRevision) return;
      review.replaceChildren(
        el(
          'p',
          `${data.totalRows} file rows (${data.doctors} doctors) · ${data.creates} new · ${data.updates} updates · ${data.errorCount} errors`,
        ),
        el(
          'p',
          `All imported doctors require source review. ${data.returnsToDraft} currently published records would return to draft. ${data.ignoredVerificationFlags} legacy verification flags will not be used to publish records. ${data.ignoredMetadataFields} legacy metadata fields (gender, link IDs and department Hindi labels) are excluded from this import.`,
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
          `Apply ${data.totalRows} doctors`,
          async () => {
            if (selectedRevision !== fileRevision) throw new Error('File changed. Preview again.');
            apply.disabled = true;
            preview.disabled = true;
            file.disabled = true;
            try {
              const payload = new FormData();
              payload.append('file', selected);
              payload.append('previewToken', data.previewToken);
              await api('/admin/doctors/import/apply', { method: 'POST', body: payload });
              if (rev === requestRevision) await doctorsPage(current, term, city, status);
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
      'Match records by source_key. Supported SwasthyaSearch CSV IDs become swasthya:doctor:<id>. City and state are required. Departments and hospitals must already exist. Separate multiple references with semicolons. Weekdays use 0 (Sunday) to 6 (Saturday). A schedule applies to all hospital references in that row; edit individual schedules after import.',
    ),
    file,
    preview,
    review,
  );
  content.append(importer);
  const data = await api(
    `/admin/doctors?page=${current}&search=${encodeURIComponent(term)}&city=${encodeURIComponent(city)}&status=${status}&limit=${directoryPageSizes.doctors}`,
  );
  if (rev !== requestRevision) return;
  section.append(directorySummary('doctors', data.summary, next => doctorsPage(1, term, city, next)));
  const bulk = directoryBulkApproval('doctors', () => doctorsPage(current, term, city, status));
  section.append(bulk.section, bulk.results);
  section.append(
    table(
      ['Select', 'Doctor', 'Location', 'Registration', 'Status', 'Completeness', 'Review date', 'Actions'],
      data.items.map((row) => {
        const actions = el('div', null, 'actions');
        actions.append(
          button('Edit', () => doctorEditor(row.id)),
          button('Image', () => providerImageEditor('doctors', row.id)),
          button('Source review', () => doctorReviewEditor(row.id)),
          button('Delete', () =>
            openEditor(
              'Delete doctor?',
              [],
              async () => {
                await api(`/admin/doctors/${row.id}?expected_version=${row.version}`, {
                  method: 'DELETE',
                });
                await doctorsPage(current, term, city, status);
              },
              'Removes the doctor and its shared care projection. Its department and hospital links will also be removed. Submitted corrections prevent deletion; withdraw publication instead.',
            ),
          ),
        );
        return [
          bulk.checkbox(row),
          row.name_en,
          [row.city, row.state].join(', '),
          row.registration_number || 'Not added',
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
      `${data.total} matching doctors. Only published doctors with current source review appear publicly.`,
    ),
  );
  pager(section, current, data.hasNext, (next) => doctorsPage(next, term, city, status));
}

async function doctorEditor(id) {
  const rev = requestRevision,
    row = id ? await api(`/admin/doctors/${id}`) : {};
  if (rev !== requestRevision) return;
  const fields = [];
  if (!id) fields.push(field('source_key', 'Permanent source key'));
  for (const [title, keys] of doctorGroups) {
    fields.push(el('h3', title));
    const group = el('div', null, 'field-row');
    for (const key of keys) {
      const value = Array.isArray(row[key]) ? row[key].join('; ') : row[key];
      group.append(
        field(
          key,
          doctorLabel(key),
          value,
          /summary|address_line|address_hi/.test(key)
            ? 'textarea'
            : /latitude|longitude|experience_years|consultation_fee/.test(key)
              ? 'number'
              : 'text',
        ),
      );
    }
    fields.push(group);
  }
  const fetchAll = async (path) => {
    const items = [];
    for (let page = 1; ; page++) {
      const data = await api(`${path}?limit=100&page=${page}`);
      items.push(...data.items);
      if (!data.hasNext) return items;
    }
  };
  const [departments, hospitals] = await Promise.all([
    fetchAll('/admin/departments'),
    fetchAll('/admin/hospitals'),
  ]);
  if (rev !== requestRevision) return;
  fields.push(el('h3', 'Medical departments'));
  const departmentPicker = el('div', null, 'field-row');
  for (const department of departments)
    departmentPicker.append(
      field(
        'department_ids',
        department.name_en + (department.is_active ? '' : ' (inactive)'),
        (row.department_ids || []).includes(department.id),
        'checkbox',
      ),
    );
  // Checkbox value must retain the linked department identity.
  [...departmentPicker.querySelectorAll('input')].forEach(
    (input, index) => (input.value = departments[index].id),
  );
  if (!departments.length)
    departmentPicker.append(
      el('p', 'No medical departments yet. Add or import them from Medical Departments.'),
    );
  fields.push(
    departmentPicker,
    el('h3', 'Hospital affiliations and recorded schedules'),
    el(
      'p',
      'Schedules describe recorded practice hours. They do not represent appointment availability.',
    ),
  );
  const scheduleList = el('div'),
    scheduleRows = [];
  function addSchedule(value = {}) {
    if (scheduleRows.length >= 30)
      throw new Error('At most 30 hospital affiliations are supported.');
    if (!hospitals.length) throw new Error('Add or import a hospital first.');
    const box = el('fieldset', null, 'doctor-affiliation'),
      legend = el('legend', 'Hospital affiliation');
    box.append(legend);
    const index = Date.now() + Math.random(),
      prefix = `schedule_${index}_`;
    const group = el('div', null, 'field-row');
    group.append(
      field(
        prefix + 'hospital_id',
        'Hospital',
        value.hospital_id || hospitals[0].id,
        'text',
        hospitals.map((h) => [h.id, `${h.name_en} - ${h.city}`]),
      ),
      field(prefix + 'role', 'Role', value.role),
      field(
        prefix + 'consultation_mode',
        'Consultation mode',
        value.consultation_mode || 'in_person',
        'text',
        [
          ['in_person', 'In person'],
          ['online', 'Online'],
          ['hybrid', 'Hybrid'],
        ],
      ),
      field(prefix + 'availability', 'Availability note', value.availability),
      field(prefix + 'start_time', 'Start time', value.start_time || '', 'time'),
      field(prefix + 'end_time', 'End time', value.end_time || '', 'time'),
      field(
        prefix + 'consultation_fee',
        'Hospital consultation fee (INR)',
        value.consultation_fee ?? '',
        'number',
      ),
    );
    box.append(group, el('p', 'Practice days'));
    const days = el('div', null, 'field-row');
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach(
      (name, day) => {
        const item = field(
          prefix + 'days',
          name,
          (value.days_of_week || []).includes(day),
          'checkbox',
        );
        item.querySelector('input').value = String(day);
        days.append(item);
      },
    );
    const model = { box, prefix };
    scheduleRows.push(model);
    box.append(
      days,
      button('Remove affiliation', () => {
        scheduleRows.splice(scheduleRows.indexOf(model), 1);
        box.remove();
      }),
    );
    scheduleList.append(box);
  }
  for (const value of row.affiliations || []) addSchedule(value);
  fields.push(
    scheduleList,
    button('Add hospital affiliation', () => addSchedule()),
  );
  openEditor(
    id ? 'Edit doctor' : 'Add doctor',
    fields,
    async (data) => {
      const body = {};
      for (const [, keys] of doctorGroups)
        for (const key of keys) {
          const text = String(data.get(key) ?? '').trim();
          body[key] = ['latitude', 'longitude', 'experience_years', 'consultation_fee'].includes(
            key,
          )
            ? text
              ? Number(text)
              : null
            : ['qualifications', 'languages'].includes(key)
              ? text
                  .split(';')
                  .map((value) => value.trim())
                  .filter(Boolean)
              : ['phone_1', 'phone_2', 'email', 'website', 'source_url'].includes(key)
                ? text || null
                : text;
        }
      body.department_ids = data.getAll('department_ids');
      body.affiliations = scheduleRows.map(({ prefix }) => ({
        hospital_id: data.get(prefix + 'hospital_id'),
        role: String(data.get(prefix + 'role') || '').trim(),
        consultation_mode: data.get(prefix + 'consultation_mode'),
        availability: String(data.get(prefix + 'availability') || '').trim(),
        days_of_week: data.getAll(prefix + 'days').map(Number),
        start_time: data.get(prefix + 'start_time') || null,
        end_time: data.get(prefix + 'end_time') || null,
        consultation_fee: data.get(prefix + 'consultation_fee')
          ? Number(data.get(prefix + 'consultation_fee'))
          : null,
      }));
      if (id) body.expectedVersion = row.version;
      else body.source_key = String(data.get('source_key') ?? '').trim();
      await send(id ? `/admin/doctors/${id}` : '/admin/doctors', body, id ? 'PATCH' : 'POST');
      await doctorsPage();
    },
    `Every save returns this doctor to draft for source review. Supply a country code unless the phone number already starts with +.${id ? ' Source key: ' + row.source_key : ''}`,
  );
  for (const key of ['source_key', 'name_en', 'city', 'state']) {
    const input = $('editor-fields').querySelector(`[name=${key}]`);
    if (input) input.required = true;
  }
}

async function doctorReviewEditor(id) {
  const rev = requestRevision,
    row = await api(`/admin/doctors/${id}`);
  if (rev !== requestRevision) return;
  openEditor(
    'Doctor source review',
    [
      field('reviewerName', 'Reviewer name'),
      field('reviewerQualification', 'Reviewer role / qualification'),
      field('evidence', 'Source review evidence', '', 'textarea'),
      field(
        'confirmedSource',
        'I checked registration, qualifications, sources and contacts',
        false,
        'checkbox',
      ),
      field('publish', 'Publish after review', true, 'checkbox'),
    ],
    async (data) => {
      await send(`/admin/doctors/${id}/review`, {
        expectedVersion: row.version,
        reviewerName: data.get('reviewerName'),
        reviewerQualification: data.get('reviewerQualification'),
        evidence: data.get('evidence'),
        confirmedSource: data.has('confirmedSource'),
        publish: data.has('publish'),
      });
      await doctorsPage();
    },
    `${row.name_en} · ${row.city}, ${row.state}. Source: ${row.source_url || 'Missing — edit before publishing'}. Review includes registration, qualifications, active departments, contacts and recorded hospital schedules. It does not establish appointment availability.`,
  );
}
