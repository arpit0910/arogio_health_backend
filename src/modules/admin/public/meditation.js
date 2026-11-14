/* Uses the portal's authenticated API, safe text nodes and audited content endpoints. */
const meditationSections = [
  ['affirmations', 'Affirmations'],
  ['meditation', 'Meditation'],
  ['breathing', 'Breathing'],
  ['grounding', 'Grounding'],
];
const meditationCopyFields = [
  'title_en',
  'title_hi',
  'description_en',
  'description_hi',
  'preparation_en',
  'preparation_hi',
  'author',
];
function meditationBody(row) {
  return Object.fromEntries(
    [
      ...meditationCopyFields,
      'kind',
      'section',
      'durationSeconds',
      'steps',
      'repeat',
      'published',
      'sortOrder',
    ]
      .map((key) => [key, row[key]])
      .concat([
        ['youtubeUrl', row.videoId ? `https://www.youtube.com/watch?v=${row.videoId}` : ''],
        ['expectedUpdatedAt', row.updatedAt],
      ]),
  );
}
async function meditationPage(current = 1, term = '', kind = '') {
  reset('Meditation');
  const rev = requestRevision,
    section = panel('Your meditation library'),
    tools = el('form', null, 'toolbar');
  section.classList.add('meditation-library');
  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Search titles';
  search.value = term;
  search.setAttribute('aria-label', 'Search meditation content');
  const type = el('select');
  type.setAttribute('aria-label', 'Content type');
  for (const [value, label] of [
    ['', 'All content'],
    ['video', 'Videos'],
    ['practice', 'Guided practices'],
  ]) {
    const option = el('option', label);
    option.value = value;
    type.append(option);
  }
  type.value = kind;
  const submit = el('button', 'Search');
  submit.type = 'submit';
  tools.addEventListener('submit', (event) => {
    event.preventDefault();
    void safely(() => meditationPage(1, search.value.trim(), type.value));
  });
  tools.append(
    search,
    type,
    submit,
    button('Add video', () => meditationEditor(null, 'video')),
    button('Add guided practice', () => meditationEditor(null, 'practice')),
  );
  section.append(
    el(
      'p',
      'Manage videos, affirmations and timed written practices. New content starts as a draft. Only published items appear in the app.',
    ),
    tools,
  );
  content.append(section);
  section.setAttribute('aria-busy', 'true');
  let data;
  try {
    data = await api(
      `/admin/meditation?page=${current}&search=${encodeURIComponent(term)}${kind ? '&kind=' + kind : ''}`,
    );
  } finally {
    section.setAttribute('aria-busy', 'false');
  }
  if (rev !== requestRevision) return;
  section.append(
    el('p', `${number(data.total)} items`),
    el('p', 'Scroll the table sideways to reach all actions.', 'meditation-table-hint help'),
  );
  section.append(
    table(
      ['Title', 'Section', 'Type / duration', 'Status / order', 'Actions'],
      data.items.map((row) => {
        const actions = el('div', null, 'actions');
        actions.append(
          button('Edit', () => meditationEditor(row.id)),
          button(row.published ? 'Unpublish' : 'Publish', async () => {
            await send(
              `/admin/meditation/${row.id}`,
              { ...meditationBody(row), published: !row.published },
              'PATCH',
            );
            if (rev === requestRevision) await meditationPage(current, term, kind);
          }),
        );
        if (row.videoId) {
          const link = el('a', 'Watch video');
          link.href = `https://www.youtube.com/watch?v=${row.videoId}`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          actions.append(link);
        }
        actions.append(
          button(
            'Delete',
            async () => {
              if (
                !confirm(`Delete "${row.title_en}"? This removes it from the meditation library.`)
              )
                return;
              await api(`/admin/meditation/${row.id}`, { method: 'DELETE' });
              if (rev === requestRevision) await meditationPage(1, term, kind);
            },
            'danger',
          ),
        );
        return [
          row.title_en,
          meditationSections.find(([key]) => key === row.section)?.[1] ?? row.section,
          `${row.kind}${row.durationSeconds ? ' / ' + Math.round((row.durationSeconds / 60) * 10) / 10 + ' min' : ''}`,
          `${row.published ? 'Published' : 'Draft'} / ${row.sortOrder}`,
          actions,
        ];
      }),
    ),
  );
  if (!data.items.length)
    section.append(el('p', 'No content found. Add a video or guided practice to get started.'));
  pager(section, current, data.hasNext, (next) => meditationPage(next, term, kind));
}
async function meditationEditor(id, initialKind = 'video') {
  const rev = requestRevision;
  const row = id
    ? await api(`/admin/meditation/${id}`)
    : {
        kind: initialKind,
        section: initialKind === 'video' ? 'affirmations' : 'meditation',
        steps: [],
        repeat: 1,
        published: false,
        sortOrder: 0,
      };
  if (rev !== requestRevision) return;
  const kindField = field('kind', 'Content type', row.kind, 'text', [
    ['video', 'YouTube video'],
    ['practice', 'Timed written practice'],
  ]);
  const videoFields = el('div'),
    practiceFields = el('div'),
    stepArea = el('div'),
    duration = el('p');
  duration.setAttribute('aria-live', 'polite');
  const url = field('youtubeUrl', 'YouTube video link', row.youtubeUrl || '', 'url');
  videoFields.append(
    url,
    field(
      'durationSeconds',
      'Video duration in seconds (optional)',
      row.durationSeconds || '',
      'number',
    ),
  );
  const repeat = field('repeat', 'Repeat the step sequence', row.repeat, 'number');
  repeat.querySelector('input').min = '1';
  repeat.querySelector('input').max = '60';
  practiceFields.append(
    field('preparation_en', 'Before you begin (English)', row.preparation_en, 'textarea'),
    field('preparation_hi', 'Before you begin (Hindi, optional)', row.preparation_hi, 'textarea'),
    el('h3', 'Timed steps'),
    stepArea,
  );
  let nextStep = 0;
  function readSteps() {
    return [...stepArea.children].map((group) =>
      Object.fromEntries(
        [...group.querySelectorAll('[data-step-field]')].map((input) => [
          input.dataset.stepField,
          input.dataset.stepField === 'seconds' ? Number(input.value) : input.value.trim(),
        ]),
      ),
    );
  }
  function updateDuration() {
    const seconds =
      readSteps().reduce((total, step) => total + Number(step.seconds || 0), 0) *
      Number(repeat.querySelector('input').value || 1);
    duration.textContent = `Total practice time: ${Math.round((seconds / 60) * 10) / 10} minutes. Maximum 60 minutes.`;
  }
  function addStep(step = {}) {
    if (stepArea.children.length >= 40) throw new Error('A practice can have up to 40 steps.');
    const group = el('fieldset'),
      legend = el('legend', 'Practice step');
    group.append(legend);
    for (const [key, label, type] of [
      ['title_en', 'Step title (English)', 'text'],
      ['title_hi', 'Step title (Hindi, optional)', 'text'],
      ['instruction_en', 'Instruction (English)', 'textarea'],
      ['instruction_hi', 'Instruction (Hindi, optional)', 'textarea'],
      ['seconds', 'Seconds', 'number'],
    ]) {
      const control = field(
        `step_${nextStep}_${key}`,
        label,
        step[key] ?? (key === 'seconds' ? 30 : ''),
        type,
      );
      const input = control.querySelector('input,textarea');
      input.dataset.stepField = key;
      if (key === 'seconds') {
        input.min = '1';
        input.max = '900';
        input.step = '1';
      }
      group.append(control);
    }
    nextStep++;
    group.append(
      button('Move up', () => {
        if (group.previousElementSibling)
          stepArea.insertBefore(group, group.previousElementSibling);
      }),
      button('Remove step', () => {
        group.remove();
        updateDuration();
      }),
    );
    stepArea.append(group);
    updateDuration();
  }
  practiceFields.append(
    button('Add step', () => addStep()),
    repeat,
    duration,
  );
  (row.steps?.length ? row.steps : [{}]).forEach((step) => addStep(step));
  stepArea.addEventListener('input', updateDuration);
  repeat.addEventListener('input', updateDuration);
  function toggleKind() {
    const video = kindField.querySelector('select').value === 'video';
    videoFields.hidden = !video;
    practiceFields.hidden = video;
  }
  kindField.addEventListener('change', toggleKind);
  toggleKind();
  const fields = [
    kindField,
    field('section', 'Section', row.section, 'text', meditationSections),
    field('title_en', 'Title (English)', row.title_en),
    field('title_hi', 'Title (Hindi, optional)', row.title_hi),
    field('description_en', 'Description (English)', row.description_en, 'textarea'),
    field('description_hi', 'Description (Hindi, optional)', row.description_hi, 'textarea'),
    field('author', 'Creator / credit (optional)', row.author),
    videoFields,
    practiceFields,
    field('sortOrder', 'Display order (lower numbers first)', row.sortOrder, 'number'),
    field('published', 'Published in the app', row.published, 'checkbox'),
  ];
  openEditor(
    id ? 'Edit meditation content' : 'Add meditation content',
    fields,
    async (form) => {
      const kind = String(form.get('kind'));
      const body = Object.fromEntries(
        meditationCopyFields.map((key) => [key, String(form.get(key) ?? '').trim()]),
      );
      Object.assign(body, {
        kind,
        section: form.get('section'),
        youtubeUrl: kind === 'video' ? String(form.get('youtubeUrl') ?? '').trim() : '',
        durationSeconds:
          kind === 'video' && form.get('durationSeconds')
            ? Number(form.get('durationSeconds'))
            : null,
        steps: kind === 'practice' ? readSteps() : [],
        repeat: kind === 'practice' ? Number(form.get('repeat')) : 1,
        sortOrder: Number(form.get('sortOrder')),
        published: form.has('published'),
        ...(id ? { expectedUpdatedAt: row.updatedAt } : {}),
      });
      await send(`/admin/meditation${id ? '/' + id : ''}`, body, id ? 'PATCH' : 'POST');
      if (rev === requestRevision) await meditationPage();
    },
    'Use HTTPS YouTube links for videos. Guided practices need English step instructions and durations; Hindi is optional. Review the content before publishing.',
  );
}
