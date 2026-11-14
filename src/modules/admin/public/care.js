/* Shares the existing in-memory admin session; never persists bearer tokens. */
async function carePage(current = 1, term = '') {
  reset('Care directory');
  const rev = requestRevision,
    section = panel('Source-reviewed care'),
    tools = el('form', null, 'toolbar');
  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Name, area or specialty';
  search.value = term;
  tools.append(
    search,
    button('Search', () => carePage(1, search.value.trim())),
    button('Add draft', () => careEditor()),
  );
  tools.addEventListener('submit', (event) => {
    event.preventDefault();
    void safely(() => carePage(1, search.value.trim()));
  });
  section.append(
    el(
      'p',
      'Jaipur only. New records are drafts. Every edit or affiliation change removes publication until explicitly reviewed again. No clinical content may be published without a qualified reviewer.',
    ),
    tools,
  );
  content.append(section);
  const result = await api(`/admin/care?page=${current}&search=${encodeURIComponent(term)}`);
  if (rev !== requestRevision) return;
  section.append(
    table(
      ['Name', 'Kind', 'Status', 'Actions'],
      result.items.map((row) => {
        const actions = el('div', null, 'actions');
        actions.append(
          button('Edit', () => careEditor(row.id)),
          button('Review / publish', () => careReview(row)),
        );
        if (row.kind === 'doctor') actions.append(button('Affiliations', () => careLinks(row)));
        return [
          row.name,
          row.kind,
          row.published ? `Published · reviewed ${date(row.reviewedAt)}` : 'Draft / withdrawn',
          actions,
        ];
      }),
    ),
  );
  if (!result.items.length)
    section.append(
      el('p', 'No sourced entries. Add only real provider records with primary-source evidence.'),
    );
  pager(section, current, result.hasNext, (next) => carePage(next, term));
  const queue = await api('/admin/care/corrections');
  if (rev !== requestRevision) return;
  const corrections = panel('Correction review queue');
  corrections.append(
    table(
      ['Entry ID', 'Report', 'Received', 'Action'],
      queue.map((row) => [
        row.entryId,
        row.message,
        date(row.createdAt),
        button('Resolve', () =>
          openEditor(
            'Resolve correction',
            [field('resolution', 'What was checked and corrected?', '', 'textarea')],
            async (form) => {
              const values = Object.fromEntries(form.entries());
              await send(
                `/admin/care/corrections/${row.id}`,
                { resolution: values.resolution },
                'PATCH',
              );
              await carePage();
            },
            'Resolve only after reviewing the source. Update and review the provider separately if needed.',
          ),
        ),
      ]),
    ),
  );
  if (!queue.length) corrections.append(el('p', 'No open corrections.'));
  content.append(corrections);
}
async function careEditor(id) {
  const row = id
    ? await api(`/admin/care/${id}`)
    : { kind: 'hospital', city: 'Jaipur', details: {} };
  const fields = [
    field(
      'kind',
      'Kind',
      row.kind,
      'text',
      ['hospital', 'doctor', 'medicine', 'lab', 'pharmacy'].map((value) => [value, value]),
    ),
    field('sourceKey', 'Stable source identifier (immutable)', row.sourceKey),
    field('name', 'Name', row.name),
    field('nameHi', 'Hindi name', row.nameHi),
    field('address', 'Verified physical address', row.address, 'textarea'),
    field('addressHi', 'Hindi address', row.addressHi, 'textarea'),
    field('phone', 'Sourced phone number', row.phone),
    field('sourceUrl', 'Primary HTTPS source', row.sourceUrl, 'url'),
  ];
  if (id)
    fields.slice(0, 2).forEach((wrap) => {
      wrap.querySelector('input,select').disabled = true;
    });
  for (const key of [
    'specialties',
    'qualifications',
    'registration',
    'languages',
    'providerType',
    'summary',
    'precautions',
  ])
    fields.push(
      field(
        key,
        key,
        Array.isArray(row.details[key]) ? row.details[key].join(', ') : row.details[key],
        ['summary', 'precautions'].includes(key) ? 'textarea' : 'text',
      ),
    );
  fields.push(
    field(
      'latitude',
      'Building latitude (optional; leave both blank if unknown)',
      row.details.latitude ?? '',
      'number',
    ),
    field('longitude', 'Building longitude', row.details.longitude ?? '', 'number'),
  );
  openEditor(
    id ? 'Edit care draft' : 'New care draft',
    fields,
    async (form) => {
      const values = Object.fromEntries(form.entries());
      const details = Object.fromEntries(
        [
          'specialties',
          'qualifications',
          'registration',
          'languages',
          'providerType',
          'summary',
          'precautions',
        ].map((key) => [
          key,
          ['specialties', 'languages'].includes(key)
            ? (values[key] || '')
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
            : values[key] || '',
        ]),
      );
      details.latitude = values.latitude === '' ? null : Number(values.latitude);
      details.longitude = values.longitude === '' ? null : Number(values.longitude);
      const body = {
        kind: row.id ? row.kind : values.kind,
        sourceKey: row.id ? row.sourceKey : values.sourceKey,
        name: values.name,
        nameHi: values.nameHi,
        city: 'Jaipur',
        address: values.address,
        addressHi: values.addressHi,
        phone: values.phone || null,
        sourceUrl: values.sourceUrl,
        details,
        ...(id ? { expectedUpdatedAt: row.updatedAt } : {}),
      };
      await send(id ? `/admin/care/${id}` : '/admin/care', body, id ? 'PUT' : 'POST');
      await carePage();
    },
    'No dummy listings. Coordinates must identify the actual building. Saving always creates a draft; qualified review is a separate action.',
  );
}
function careReview(row) {
  openEditor(
    'Source and publication review',
    [
      field('reviewerName', 'Reviewer full name'),
      field('reviewerQualification', 'Reviewer role / clinical qualification'),
      field('evidence', 'Evidence checked, source date and limitations', '', 'textarea'),
      field('confirmedSource', 'Primary source independently checked', false, 'checkbox'),
      field(
        'publish',
        'Publish this reviewed record (uncheck to withdraw)',
        row.published,
        'checkbox',
      ),
    ],
    async (form) => {
      const values = Object.fromEntries(form.entries());
      await send(
        `/admin/care/${row.id}/review`,
        {
          ...values,
          confirmedSource: form.has('confirmedSource'),
          publish: form.has('publish'),
          expectedUpdatedAt: row.updatedAt,
        },
        'POST',
      );
      await carePage();
    },
    'For medicine education, a qualified clinical reviewer must approve all content. Attestation is recorded in the audit trail. This is never automatic verification.',
  );
}
async function careLinks(row) {
  row = await api(`/admin/care/${row.id}`);
  openEditor(
    'Doctor–hospital affiliations',
    [
      field(
        'hospitalIds',
        'Existing hospital UUIDs, comma separated',
        (row.affiliations || []).map((item) => item.id).join(','),
      ),
    ],
    async (form) => {
      const values = Object.fromEntries(form.entries());
      await send(
        `/admin/care/${row.id}/affiliations`,
        {
          hospitalIds: values.hospitalIds
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          expectedUpdatedAt: row.updatedAt,
        },
        'PUT',
      );
      await carePage();
    },
    'Only attach hospitals whose affiliation has been checked. This change unpublishes the doctor until a new source review.',
  );
}
