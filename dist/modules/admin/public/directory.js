/* CSV values are rendered as text, never HTML. */
const articleFields = [
  'title_en',
  'title_hi',
  'excerpt_en',
  'excerpt_hi',
  'content_en',
  'content_hi',
  'category',
  'image_url',
  'author_name',
];
const bankFields = [
  'name_en',
  'name_hi',
  'city',
  'state',
  'pincode',
  'landmark',
  'address_en',
  'address_hi',
  'country_code',
  'phone',
  'emergency_country_code',
  'emergency_phone',
  'email',
  'website',
  'latitude',
  'longitude',
  'available_blood_groups',
];
const bankFlags = [
  'is_active',
  'is_verified',
  'is_24_7',
  'is_government',
  'component_facility',
  'apheresis_facility',
];
const labelFor = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b(en|hi)\b/g, (value) => (value === 'en' ? '(English)' : '(Hindi)'));
async function directoryPage(kind, current = 1, term = '') {
  const articles = kind === 'articles',
    title = articles ? 'Articles' : 'Blood banks';
  reset(title);
  const rev = requestRevision,
    section = panel(),
    tools = el('form', null, 'toolbar');
  const input = el('input');
  input.type = 'search';
  input.placeholder = articles ? 'Search titles or categories' : 'Search name, city or pincode';
  input.value = term;
  input.setAttribute('aria-label', input.placeholder);
  tools.addEventListener('submit', (event) => {
    event.preventDefault();
    void safely(() => directoryPage(kind, 1, input.value.trim()));
  });
  const submit = el('button', 'Search');
  submit.type = 'submit';
  tools.append(
    input,
    submit,
    button(articles ? 'Create article' : 'Add blood bank', () => directoryEditor(kind)),
  );
  if (articles) tools.append(button('Manage categories', () => categoryManager()));
  section.append(tools);
  content.append(section);
  const uploader = panel('Import Excel or CSV'),
    file = el('input');
  file.type = 'file';
  file.accept =
    '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';
  file.setAttribute('aria-label', 'Choose Excel or CSV export');
  uploader.append(
    button('Download Excel template', async () => {
      const blob = await api(`/admin/content/${kind}/template`, { blob: true });
      if (rev !== requestRevision) return;
      const url = URL.createObjectURL(blob),
        link = el('a');
      link.href = url;
      link.download = `${kind}-template.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }),
  );
  const review = el('div'),
    preview = button('Preview import', async () => {
      const selected = file.files[0];
      if (!selected || selected.size > 8 * 1024 * 1024)
        throw new Error('Choose an Excel (.xlsx) or CSV file up to 8 MB.');
      preview.disabled = true;
      review.replaceChildren(el('p', 'Validating records…'));
      try {
        const form = new FormData();
        form.append('file', selected);
        const data = await api(`/admin/content/${kind}/import/preview`, {
          method: 'POST',
          body: form,
        });
        if (rev !== requestRevision) return;
        review.replaceChildren(
          el(
            'p',
            `${data.totalRows} records · ${data.creates} new · ${data.updates} updates · ${data.errorCount} errors`,
          ),
        );
        if (articles)
          review.append(
            el(
              'p',
              `${data.publishedRows} articles will be published across ${data.categoryCount} categories. ${data.thumbnailFallbacks} will use their category thumbnail. Existing custom images are kept when the import has no image URL.`,
            ),
          );
        else
          review.append(
            el(
              'p',
              `${data.missingCoordinates} listings have no coordinates. They remain searchable by city, but cannot appear in nearby results.`,
            ),
          );
        for (const error of data.errors)
          review.append(el('p', `Row ${error.row}: ${error.message}`, 'error'));
        if (data.sample.length)
          review.append(
            table(
              ['Export ID', 'Preview'],
              data.sample.map((row) => [row.source_id, row.title]),
            ),
          );
        if (!data.errorCount) {
          const apply = button(
            `Import ${data.totalRows} records`,
            async () => {
              apply.disabled = true;
              file.disabled = true;
              try {
                const body = new FormData();
                body.append('file', selected);
                await api(`/admin/content/${kind}/import/apply`, { method: 'POST', body });
                if (rev === requestRevision) await directoryPage(kind);
              } finally {
                apply.disabled = false;
                file.disabled = false;
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
  file.addEventListener('change', () => review.replaceChildren());
  uploader.append(
    el(
      'p',
      'Upload .xlsx or UTF-8 CSV with plain values. Article workbooks may include Articles, Categories and Read Me sheets. Optional image_url columns accept HTTPS images; empty values use topic thumbnails. Matching export IDs update existing records. An invalid file imports nothing.',
    ),
    file,
    preview,
    review,
  );
  content.append(uploader);
  const data = await api(
    `/admin/content/${kind}?page=${current}&search=${encodeURIComponent(term)}`,
  );
  if (rev !== requestRevision) return;
  if (!articles && data.missingCoordinates)
    section.append(el('p', `${data.missingCoordinates} matching listings need coordinates.`));
  section.append(
    table(
      articles
        ? ['Thumbnail', 'Title', 'Category', 'Status', 'Updated', 'Actions']
        : ['Name', 'City', 'Coordinates', 'Status', 'Actions'],
      data.items.map((row) => {
        const actions = el('div', null, 'actions');
        actions.append(
          button('Edit', () => directoryEditor(kind, row.id)),
          button('Delete', () =>
            openEditor(
              'Delete record?',
              [],
              async () => {
                await api(`/admin/content/${kind}/${row.id}`, { method: 'DELETE' });
                await directoryPage(kind, current, term);
              },
              'This permanently removes this record.',
            ),
          ),
        );
        if (!articles) actions.append(button('Source review', () => reviewBloodBank(row)));
        return articles
          ? [
              articleThumbnail(row.thumbnail_url, row.title_en),
              row.title_en,
              row.category,
              row.is_published ? 'Published' : 'Draft',
              date(row.updated_at),
              actions,
            ]
          : [
              row.name_en,
              `${row.city}, ${row.state}`,
              row.latitude == null ? 'Missing' : 'Added',
              row.is_active ? 'Visible' : 'Hidden',
              actions,
            ];
      }),
    ),
  );
  if (!data.items.length)
    section.append(el('p', 'No records found. Import a CSV or add a record.'));
  pager(section, current, data.hasNext, (next) => directoryPage(kind, next, term));
}
async function directoryEditor(kind, id) {
  const articles = kind === 'articles',
    rev = requestRevision;
  const row = id
    ? await api(`/admin/content/${kind}/${id}`)
    : { country_code: '+91', emergency_country_code: '+91', is_active: true };
  if (rev !== requestRevision) return;
  const keys = articles ? articleFields : bankFields,
    flags = articles ? ['is_published'] : bankFlags;
  const fields = keys.map((key) =>
    field(
      key,
      labelFor(key),
      key === 'available_blood_groups' ? (row[key] || []).join(';') : row[key],
      /content|excerpt|address/.test(key)
        ? 'textarea'
        : /latitude|longitude/.test(key)
          ? 'number'
          : 'text',
    ),
  );
  fields.push(...flags.map((key) => field(key, labelFor(key), row[key], 'checkbox')));
  openEditor(
    id ? 'Edit record' : articles ? 'Create article' : 'Add blood bank',
    fields,
    async (form) => {
      const body = Object.fromEntries(keys.map((key) => [key, String(form.get(key) ?? '').trim()]));
      for (const key of flags) body[key] = form.has(key);
      if (!articles) {
        for (const key of ['latitude', 'longitude'])
          body[key] = body[key] === '' ? null : Number(body[key]);
        for (const key of ['phone', 'emergency_phone', 'email', 'website', 'pincode', 'landmark', 'source_url', 'verified_at'])
          body[key] ||= null;
        body.available_blood_groups = body.available_blood_groups
          .split(';')
          .map((value) => value.trim())
          .filter(Boolean);
      }
      await send(`/admin/content/${kind}${id ? '/' + id : ''}`, body, id ? 'PATCH' : 'POST');
      await directoryPage(kind);
    },
    articles
      ? 'English content is required. Hindi is optional. Enter an existing category or a new name. Image URL must use HTTPS; leave it empty to use the category thumbnail. Publish to make this article visible in the app.'
      : 'Enter both coordinates or leave both empty. Listed blood groups are not live stock. Separate groups with semicolons, for example A+;O-.',
  );
}
function articleThumbnail(url, title) {
  const image = el('img');
  image.src = url;
  image.alt = title;
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  image.width = 96;
  image.height = 64;
  image.style.objectFit = 'cover';
  image.style.borderRadius = '8px';
  image.addEventListener(
    'error',
    () => {
      image.src = '/admin-assets/article-thumbnails/wellbeing.jpg';
    },
    { once: true },
  );
  return image;
}
async function categoryManager() {
  reset('Article categories');
  const rev = requestRevision,
    section = panel('Classify your library');
  section.append(
    el(
      'p',
      'Each article belongs to one category. Category thumbnails also cover articles without a custom image. Category names are stable; update the Hindi name, description or thumbnail below.',
    ),
  );
  const actions = el('div', null, 'toolbar');
  actions.append(
    button('Add category', () => categoryEditor()),
    button('View articles', () => directoryPage('articles')),
  );
  section.append(actions);
  content.append(section);
  const rows = await api('/admin/content/article-categories');
  if (rev !== requestRevision) return;
  section.append(
    table(
      ['Thumbnail', 'Category', 'Hindi name', 'Articles', 'Actions'],
      rows.map((row) => [
        articleThumbnail(row.image_url, row.name),
        row.name,
        row.name_hi || '—',
        String(row.count),
        button('Edit', () => categoryEditor(row)),
      ]),
    ),
  );
  if (!rows.length)
    section.append(el('p', 'Add a category or import the article workbook to begin.'));
}
function categoryEditor(row) {
  const name = field('name', 'Category name (English)', row?.name || '', 'text');
  if (row) name.querySelector('input').readOnly = true;
  openEditor(
    row ? 'Edit category' : 'Add category',
    [
      name,
      field('name_hi', 'Category name (Hindi)', row?.name_hi || '', 'text'),
      field('description', 'Description', row?.description || '', 'textarea'),
      field('image_url', 'Thumbnail HTTPS URL', row?.custom_image_url || '', 'text'),
    ],
    async (form) => {
      await send(
        '/admin/content/article-categories',
        Object.fromEntries(
          ['name', 'name_hi', 'description', 'image_url'].map((key) => [
            key,
            String(form.get(key) || '').trim(),
          ]),
        ),
      );
      await categoryManager();
    },
    'Leave the image URL empty to use the bundled topic photograph. Custom images must be publicly accessible HTTPS URLs.',
  );
}
