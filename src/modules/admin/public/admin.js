/* Super-admin interface. All privileges are checked by the API, never by this UI. */
'use strict';
const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text != null) n.textContent = String(text);
  if (cls) n.className = cls;
  return n;
};
const button = (title, action, cls = 'secondary') => {
  const n = el('button', title, cls);
  n.type = 'button';
  n.addEventListener('click', () => void safely(action));
  return n;
};
const content = $('content');
let tokens = null,
  renewing = null,
  authEpoch = 0,
  page = 'overview',
  peoplePage = 1,
  search = '',
  currentUser = null,
  recordTab = 'activity',
  auditPage = 1,
  recordPage = 1,
  dialogSave = null,
  requestRevision = 0;
const imageUrls = new Set();
const date = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not added';
const number = (value) => Number(value ?? 0).toLocaleString('en-IN');
async function api(path, options = {}) {
  const session = tokens,
    epoch = authEpoch;
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  if (session) headers.Authorization = `Bearer ${session.accessToken}`;
  const response = await fetch('/api/v1' + path, {
    ...options,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (epoch !== authEpoch) throw new Error('Session changed. Please sign in again.');
  if (response.status === 401 && session && !options.retried) {
    if (tokens !== session) return api(path, { ...options, retried: true });
    if (!renewing || renewing.epoch !== epoch) {
      const promise = fetch('/api/v1/auth/tokens/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error('Your session has expired. Sign in again.');
          const pair = await r.json();
          if (epoch !== authEpoch || tokens !== session) {
            await fetch('/api/v1/auth/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: pair.refreshToken }),
            }).catch(() => {});
            throw new Error('Session changed. Please sign in again.');
          }
          tokens = pair;
        })
        .finally(() => {
          if (renewing?.epoch === epoch) renewing = null;
        });
      renewing = { epoch, promise };
    }
    try {
      await renewing.promise;
    } catch (error) {
      if (epoch === authEpoch) void signOut(false);
      throw error;
    }
    if (epoch !== authEpoch) throw new Error('Session changed. Please sign in again.');
    return api(path, { ...options, retried: true });
  }
  if (!response.ok) {
    let message = 'Request could not be completed.';
    try {
      const body = await response.json();
      message = body.error?.message ?? body.message ?? message;
    } catch {}
    throw new Error(Array.isArray(message) ? message.join(' ') : message);
  }
  if (options.blob) return response.blob();
  return response.status === 204 ? null : response.json();
}
const send = (path, body, method = 'POST') => api(path, { method, body: JSON.stringify(body) });
async function safely(action) {
  try {
    await action();
  } catch (error) {
    $('message').className = 'notice error';
    $('message').textContent = error.message;
  }
}
function reset(title) {
  requestRevision++;
  imageUrls.forEach(URL.revokeObjectURL);
  imageUrls.clear();
  $('page-title').textContent = title;
  content.replaceChildren();
  $('message').textContent = '';
  $('message').className = '';
  content.setAttribute('aria-busy', 'false');
  document
    .querySelectorAll('nav button')
    .forEach((n) => n.classList.toggle('active', n.dataset.page === page));
}
function panel(title) {
  const p = el('section', null, 'panel');
  if (title) p.append(el('h2', title));
  return p;
}
function table(headers, rows) {
  const wrap = el('div', null, 'table-wrap'),
    t = el('table'),
    head = el('thead'),
    tr = el('tr');
  headers.forEach((h) => tr.append(el('th', h)));
  head.append(tr);
  t.append(head);
  const body = el('tbody');
  for (const row of rows) {
    const r = el('tr');
    row.forEach((value) => {
      const td = el('td');
      td.append(
        value instanceof Node ? value : document.createTextNode(String(value ?? 'Not added')),
      );
      r.append(td);
    });
    body.append(r);
  }
  t.append(body);
  wrap.append(t);
  if (!rows.length) wrap.append(el('p', 'No records to display.', 'empty'));
  return wrap;
}
function badge(status) {
  return el(
    'span',
    status,
    'status' + (status === 'active' || status === 'succeeded' ? '' : ' off'),
  );
}
function pager(container, current, hasNext, change) {
  const n = el('div', null, 'pager'),
    prev = button('Previous', () => change(current - 1)),
    next = button('Next', () => change(current + 1));
  prev.disabled = current === 1;
  next.disabled = !hasNext;
  n.append(prev, el('span', `Page ${current}`), next);
  container.append(n);
}
function field(name, label, value = '', type = 'text', options) {
  const wrap = el('label', label);
  let input;
  if (options) {
    input = el('select');
    for (const [v, t] of options) {
      const option = el('option', t);
      option.value = v;
      input.append(option);
    }
  } else input = el(type === 'textarea' ? 'textarea' : 'input');
  input.name = name;
  if (type !== 'textarea' && !options) input.type = type;
  if (type === 'checkbox') {
    wrap.className = 'check';
    input.checked = Boolean(value);
  } else input.value = value ?? '';
  if (type === 'password') input.autocomplete = 'new-password';
  if (type === 'number') input.step = 'any';
  wrap.append(input);
  return wrap;
}
function openEditor(title, fields, onSave, description = '') {
  $('editor-title').textContent = title;
  $('editor-description').textContent = description;
  $('editor-fields').replaceChildren(...fields);
  $('editor-error').textContent = '';
  dialogSave = onSave;
  $('editor').showModal();
}
$('editor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('save-editor').disabled = true;
  $('editor-error').textContent = '';
  try {
    await dialogSave(new FormData(e.target));
    $('editor').close();
  } catch (error) {
    $('editor-error').textContent = error.message;
  } finally {
    $('save-editor').disabled = false;
  }
});
$('close-editor').onclick = $('cancel-editor').onclick = () => $('editor').close();
async function signOut(revoke = true) {
  const previous = tokens;
  tokens = null;
  authEpoch++;
  currentUser = null;
  $('editor').close();
  $('editor-fields').replaceChildren();
  requestRevision++;
  $('portal').hidden = true;
  $('login').hidden = false;
  content.replaceChildren();
  imageUrls.forEach(URL.revokeObjectURL);
  imageUrls.clear();
  if (revoke && previous)
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: previous.refreshToken }),
    }).catch(() => {});
}
$('logout').onclick = () => void signOut();
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submit = e.target.querySelector('button');
  submit.disabled = true;
  $('login-error').textContent = '';
  try {
    const data = new FormData(e.target);
    tokens = await send('/auth/email/login', {
      email: String(data.get('email')).trim().toLowerCase(),
      password: data.get('password'),
    });
    await api('/admin/me');
    e.target.reset();
    $('login').hidden = true;
    $('portal').hidden = false;
    page = 'overview';
    await show();
  } catch (error) {
    await signOut();
    $('login-error').textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
$('today').textContent = new Date().toLocaleDateString('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});
document.querySelectorAll('[data-page]').forEach((n) =>
  n.addEventListener('click', () => {
    page = n.dataset.page;
    void safely(show);
  }),
);
$('create-user').onclick = () =>
  openEditor(
    'Create an account',
    [
      field('fullName', 'Full name'),
      field('email', 'Email', '', 'email'),
      field('password', 'Initial password (at least 12 characters)', '', 'password'),
    ],
    async (f) => {
      await send('/admin/users', Object.fromEntries(f));
      page = 'people';
      peoplePage = 1;
      await show();
    },
    'The person will complete their profile when signing in. Share initial credentials through your approved secure channel.',
  );
async function show() {
  if (page === 'overview') return overview();
  if (page === 'people') return people();
  if (page === 'banners') return homeBanners();
  return audit();
}
async function overview() {
  reset('Overview');
  content.setAttribute('aria-busy', 'true');
  const rev = requestRevision,
    data = await api('/admin/analytics');
  if (rev !== requestRevision) return;
  const metrics = el('div', null, 'metrics');
  for (const [label, value, detail] of [
    ['People', data.accounts.total, `${number(data.accounts.new30)} joined in 30 days`],
    [
      'Active accounts',
      data.accounts.active,
      `${number(data.accounts.completed)} profiles completed`,
    ],
    ['Referred accounts', data.accounts.referred, 'Recorded referral attribution'],
    [
      'Water records',
      data.tracking.water.records,
      `${number(data.tracking.water.totalMl)} ml recorded across all time`,
    ],
  ]) {
    const m = el('div', null, 'metric');
    m.append(el('span', label), el('strong', number(value)), el('small', detail));
    metrics.append(m);
  }
  content.append(metrics);
  const split = el('div', null, 'split'),
    growth = panel('Your community is growing'),
    chart = el('div', null, 'chart');
  const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 29 + i);
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }),
    values = days.map((day) => Number(data.growth.find((row) => row.day === day)?.accounts ?? 0)),
    max = Math.max(1, ...values);
  values.forEach((value, i) => {
    const wrap = el('div', null, 'bar-wrap'),
      bar = el('div', null, 'bar');
    bar.style.height = `${(value / max) * 100}%`;
    bar.title = `${days[i]}: ${value} new accounts`;
    wrap.append(bar);
    chart.append(wrap);
  });
  growth.append(el('p', 'New accounts each day over the last 30 days.'), chart);
  const caption = el('div', null, 'chart-caption');
  caption.append(el('span', days[0]), el('span', 'Today'));
  growth.append(caption);
  const care = panel('Care at a glance');
  care.append(
    table(
      ['Recorded activity', 'Total'],
      [
        ['Configured care profiles', number(data.tracking.configuredAccounts)],
        ['Cycle check-ins', number(data.tracking.cycleEntries)],
        ['Soft-deleted accounts', number(data.accounts.deleted)],
        ['Joined in 7 days', number(data.accounts.new7)],
      ],
    ),
  );
  split.append(growth, care);
  content.append(split);
  const recent = panel('Recently joined');
  recent.append(
    table(
      ['Person', 'Email', 'Joined', ''],
      data.recent.map((u) => [
        u.fullName ?? 'No name',
        u.email,
        date(u.createdAt),
        button('View account', () => userDetail(u.id)),
      ]),
    ),
  );
  content.append(recent);
  const refs = panel('Referral activity');
  refs.append(
    table(
      ['Referrer', 'Code', 'Referred accounts'],
      data.referrals.map((r) => [
        r.fullName ?? r.email ?? r.id,
        r.referralCode,
        number(r.invitations),
      ]),
    ),
  );
  content.append(refs);
  content.setAttribute('aria-busy', 'false');
}
async function people() {
  reset('People');
  const toolbar = el('div', null, 'toolbar'),
    form = el('form'),
    input = el('input');
  input.type = 'search';
  input.placeholder = 'Search name or email';
  input.setAttribute('aria-label', 'Search people');
  input.value = search;
  const submit = el('button', 'Search');
  form.append(input, submit);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    search = input.value;
    peoplePage = 1;
    void safely(people);
  });
  toolbar.append(form);
  content.append(toolbar);
  const rev = requestRevision,
    data = await api(`/admin/users?search=${encodeURIComponent(search)}&page=${peoplePage}`);
  if (rev !== requestRevision) return;
  const p = panel(`${number(data.total)} accounts`);
  p.append(
    table(
      ['Person', 'Email', 'Status', 'Joined', ''],
      data.rows.map((u) => [
        u.fullName ?? 'No name',
        u.email,
        badge(u.deletionRequestedAt ? 'soft-deleted' : u.status),
        date(u.createdAt),
        button('View account', () => userDetail(u.id)),
      ]),
    ),
  );
  pager(p, peoplePage, peoplePage * 25 < data.total, async (n) => {
    peoplePage = n;
    await people();
  });
  content.append(p);
}
function editProfile(user) {
  const p = user.profileSetup ?? {};
  openEditor(
    'Edit profile',
    [
      field('fullName', 'Full name', user.fullName),
      field('username', 'Username', user.username),
      field('heightValue', 'Height', user.heightValue, 'number'),
      field('heightUnit', 'Height unit', user.heightUnit ?? 'cm', 'text', [
        ['cm', 'cm'],
        ['in', 'in'],
      ]),
      field('weightValue', 'Weight', user.weightValue, 'number'),
      field('weightUnit', 'Weight unit', user.weightUnit ?? 'kg', 'text', [
        ['kg', 'kg'],
        ['lb', 'lb'],
      ]),
      field('location', 'City', p.location),
      field('dateOfBirth', 'Date of birth', p.dateOfBirth, 'date'),
      field('gender', 'Gender', p.gender ?? '', 'text', [
        ['', 'Not added'],
        ['female', 'Female'],
        ['male', 'Male'],
        ['other', 'Other'],
        ['prefer_not_to_say', 'Prefer not to say'],
      ]),
    ],
    async (f) => {
      const values = Object.fromEntries([...f].filter(([, v]) => v !== ''));
      if (values.heightValue) values.heightValue = Number(values.heightValue);
      else delete values.heightUnit;
      if (values.weightValue) values.weightValue = Number(values.weightValue);
      else delete values.weightUnit;
      await send(`/admin/users/${user.id}`, values, 'PATCH');
      await userDetail(user.id);
    },
  );
}
async function accountAction(user, action) {
  const title =
    action === 'delete'
      ? 'Soft-delete this account?'
      : action === 'disable'
        ? 'Disable this account?'
        : 'Restore this account?';
  openEditor(
    title,
    [],
    async () => {
      await send(`/admin/users/${user.id}/action`, { action, confirm: true });
      await userDetail(user.id);
    },
    action === 'delete'
      ? 'All records are retained. Sessions are revoked. The person can sign in to recover within 30 days.'
      : 'All existing sessions will be revoked. Saved records are retained.',
  );
}
async function userDetail(id) {
  page = 'people';
  reset('Account details');
  const rev = requestRevision,
    user = await api(`/admin/users/${id}`);
  if (rev !== requestRevision) return;
  currentUser = user;
  const p = panel(),
    head = el('div', null, 'section-head'),
    name = el('div', null, 'user-heading'),
    avatar = el('div', (user.fullName ?? user.email ?? 'A')[0].toUpperCase(), 'avatar'),
    copy = el('div');
  copy.append(el('h2', user.fullName ?? 'Unnamed account'), el('p', user.email ?? user.id));
  name.append(avatar, copy);
  head.append(name, button('Back to people', people));
  p.append(head);
  const details = el('div', null, 'details');
  for (const [label, value] of [
    ['Status', user.deletionRequestedAt ? 'Soft-deleted' : user.status],
    ['City', user.profileSetup?.location ?? 'Not added'],
    ['Referral code', user.referralCode],
    ['Referred by', user.referredByUserId ?? 'No referrer'],
    ['Joined', date(user.createdAt)],
    ['Recovery deadline', date(user.recoverableUntil)],
  ]) {
    const d = el('div');
    d.append(el('span', label), el('strong', value));
    details.append(d);
  }
  p.append(details);
  const actions = el('div', null, 'toolbar');
  actions.style.marginTop = '24px';
  const edit = button('Edit profile', () => editProfile(user));
  edit.disabled = user.status !== 'active';
  actions.append(
    edit,
    button(user.status === 'active' ? 'Disable account' : 'Restore account', () =>
      accountAction(user, user.status === 'active' ? 'disable' : 'restore'),
    ),
    button('Soft-delete account', () => accountAction(user, 'delete'), 'danger'),
  );
  p.append(actions);
  content.append(p);
  const tabs = el('div', null, 'tabs');
  for (const [key, title] of [
    ['activity', 'Activity'],
    ['water', 'Water'],
    ['medicines', 'Medicines'],
    ['cycle', 'Cycle check-ins'],
    ['periods', 'Period history'],
  ])
    tabs.append(
      button(
        title,
        async () => {
          recordTab = key;
          recordPage = 1;
          await userDetail(id);
        },
        recordTab === key ? '' : 'secondary',
      ),
    );
  content.append(tabs);
  const records = panel(),
    rh = el('div', null, 'record-head');
  rh.append(
    el('h2', `Recorded ${recordTab}`),
    button('Add or edit record', () => trackingEditor(user)),
  );
  records.append(rh);
  records.append(
    el(
      'p',
      'Connected-app readings and phone sensor history stay on the device and are not uploaded. This view contains saved Arogio records.',
    ),
  );
  if (recordTab === 'activity') {
    records.append(
      table(
        ['Date', 'Steps', 'Exercise (min)', 'Sleep (h)', 'Food (kcal)', ''],
        user.wellness.activityTracking.days.map((d) => [
          d.day,
          d.values.Steps ?? 'Not logged',
          d.values.ExerciseSession ?? 'Not logged',
          d.values.SleepSession ?? 'Not logged',
          d.values.Nutrition ?? 'Not logged',
          button('Edit', () => trackingEditor(user, 'activity', d)),
        ]),
      ),
    );
    records.append(button('Edit daily targets', () => trackingEditor(user, 'goals')));
  } else if (recordTab === 'medicines') {
    records.append(
      table(
        ['Medicine', 'Doses', 'Reminders', ''],
        user.wellness.medicines.map((m) => [
          m.name,
          m.doses.map((d) => `${d.time}: ${d.amount}`).join(', '),
          m.enabled ? 'On' : 'Off',
          button('Edit', () => trackingEditor(user, 'medicines', m)),
        ]),
      ),
    );
  } else {
    const rows = await api(`/admin/users/${id}/records/${recordTab}?page=${recordPage}`);
    if (rev !== requestRevision) return;
    if (recordTab === 'water') {
      records.append(
        table(
          ['Time', 'Amount (ml)', ''],
          rows.map((r) => [
            date(r.loggedAt),
            r.amountMl,
            button('Edit', () => trackingEditor(user, 'water', r)),
          ]),
        ),
      );
      records.append(button('Edit water plan', () => trackingEditor(user, 'plan')));
    }
    if (recordTab === 'cycle')
      records.append(
        table(
          ['Date', 'Flow', 'Symptoms', 'Mood', 'Notes', ''],
          rows.map((r) => [
            r.day,
            r.flow,
            r.symptoms.join(', '),
            r.mood ?? '',
            r.notes,
            button('Edit', () => trackingEditor(user, 'cycle', r)),
          ]),
        ),
      );
    if (recordTab === 'periods')
      records.append(
        table(
          ['Start', 'End', ''],
          rows.map((r) => [
            r.startDate,
            r.endDate ?? 'Ongoing',
            button('Edit', () => trackingEditor(user, 'periods', r)),
          ]),
        ),
      );
    pager(records, recordPage, rows.length === 100, async (n) => {
      recordPage = n;
      await userDetail(id);
    });
  }
  const controls = el('div', null, 'toolbar');
  controls.style.marginTop = '24px';
  if (recordTab === 'cycle' || recordTab === 'periods')
    controls.append(button('Edit cycle preferences', () => trackingEditor(user, 'cycle-settings')));
  const clearArea = recordTab === 'periods' ? 'cycle' : recordTab;
  if (['water', 'cycle', 'activity'].includes(clearArea))
    controls.append(
      button(
        `Delete all ${clearArea} tracking`,
        () =>
          openEditor(
            `Delete ${clearArea} records?`,
            [],
            async () => {
              await changeTracking(user, `${clearArea}/data`, null, 'DELETE');
            },
            'This permanently removes this category of tracking. Account deletion instead keeps records.',
          ),
        'danger',
      ),
    );
  records.append(controls);
  content.append(records);
}
const metrics = [
  ['Steps', 'Steps'],
  ['ExerciseSession', 'Exercise (minutes)'],
  ['SleepSession', 'Sleep (hours)'],
  ['Distance', 'Distance (km)'],
  ['ActiveCaloriesBurned', 'Active calories (kcal)'],
  ['Nutrition', 'Food calories (kcal)'],
];
async function changeTracking(user, path, body, method = 'PUT') {
  await send(`/admin/users/${user.id}/tracking`, {
    path,
    method,
    body: body ?? undefined,
    confirm: true,
  });
  await userDetail(user.id);
}
function trackingEditor(user, kind = recordTab, record = {}) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    current = record,
    fields = [],
    f = (...args) => fields.push(field(...args));
  let save;
  if (kind === 'activity' || kind === 'goals') {
    if (kind === 'activity') f('day', 'Date', current.day ?? today, 'date');
    const values = kind === 'goals' ? user.wellness.activityTracking.goals : (current.values ?? {});
    metrics.forEach(([key, label]) => f(key, label, values[key] ?? '', 'number'));
    save = (data) => {
      const values = Object.fromEntries(
        metrics.map(([key]) => [key, data.get(key) === '' ? null : Number(data.get(key))]),
      );
      return changeTracking(
        user,
        kind === 'goals' ? 'activity/goals' : `activity/days/${data.get('day')}`,
        kind === 'goals' ? { goals: values } : { values },
      );
    };
  } else if (kind === 'water') {
    f('amountMl', 'Amount (ml)', current.amountMl ?? 250, 'number');
    f(
      'loggedAt',
      'Logged at (local time)',
      current.loggedAt
        ? new Date(new Date(current.loggedAt) - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      'datetime-local',
    );
    save = (data) =>
      changeTracking(user, `water/logs/${current.id ?? crypto.randomUUID()}`, {
        amountMl: Number(data.get('amountMl')),
        loggedAt: new Date(data.get('loggedAt')).toISOString(),
        taskId: current.taskId ?? null,
      });
  } else if (kind === 'plan') {
    const p = user.wellness.waterPlan ?? {};
    f('targetMl', 'Daily target (ml)', p.targetMl ?? 2000, 'number');
    f('servingMl', 'Serving (ml)', p.servingMl ?? 250, 'number');
    f('wakeTime', 'Wake time', p.wakeTime ?? '07:00', 'time');
    f('sleepTime', 'Sleep time', p.sleepTime ?? '23:00', 'time');
    f('remindersEnabled', 'Reminders enabled', p.remindersEnabled ?? false, 'checkbox');
    save = (data) =>
      changeTracking(user, 'water/plan', {
        targetMl: Number(data.get('targetMl')),
        servingMl: Number(data.get('servingMl')),
        wakeTime: data.get('wakeTime'),
        sleepTime: data.get('sleepTime'),
        timezone: 'Asia/Kolkata',
        remindersEnabled: data.has('remindersEnabled'),
        pausedUntil: p.pausedUntil ?? null,
      });
  } else if (kind === 'medicines') {
    f('name', 'Medicine name', current.name ?? '');
    f('notes', 'Notes', current.notes ?? '', 'textarea');
    f(
      'doses',
      'Doses (one per line: 08:00 | 1 tablet)',
      current.doses?.map((d) => `${d.time} | ${d.amount}`).join('\n') ?? '08:00 | 1 tablet',
      'textarea',
    );
    f('enabled', 'Reminders enabled', current.enabled ?? false, 'checkbox');
    save = (data) =>
      changeTracking(user, `medicines/${current.id ?? crypto.randomUUID()}`, {
        name: data.get('name'),
        notes: data.get('notes'),
        enabled: data.has('enabled'),
        doses: String(data.get('doses'))
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [time, ...amount] = line.split('|');
            return { time: time.trim(), amount: amount.join('|').trim() };
          }),
      });
  } else if (kind === 'periods') {
    f('startDate', 'Start date', current.startDate ?? today, 'date');
    f('endDate', 'End date (blank if ongoing)', current.endDate ?? '', 'date');
    save = (data) =>
      changeTracking(user, `cycle/periods/${current.id ?? crypto.randomUUID()}`, {
        startDate: data.get('startDate'),
        endDate: data.get('endDate') || null,
      });
  } else if (kind === 'cycle') {
    f('day', 'Date', current.day ?? today, 'date');
    f(
      'flow',
      'Flow',
      current.flow ?? 'none',
      'text',
      ['none', 'spotting', 'light', 'medium', 'heavy'].map((v) => [v, v]),
    );
    f('symptoms', 'Symptoms (comma separated)', current.symptoms?.join(', ') ?? '');
    f('mood', 'Mood (blank if not recorded)', current.mood ?? '');
    f('notes', 'Notes', current.notes ?? '', 'textarea');
    save = (data) =>
      changeTracking(user, `cycle/entries/${data.get('day')}`, {
        flow: data.get('flow'),
        symptoms: String(data.get('symptoms'))
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        mood: data.get('mood') || null,
        notes: data.get('notes'),
      });
  } else if (kind === 'cycle-settings') {
    const p = user.wellness.cycleSettings ?? {};
    for (const [key, label, fallback] of [
      ['cycleLength', 'Cycle length (days)', 28],
      ['periodLength', 'Period length (days)', 5],
      ['reminderDaysBefore', 'Reminder days before', 2],
    ])
      f(key, label, p[key] ?? fallback, 'number');
    f('reminderTime', 'Reminder time', p.reminderTime ?? '09:00', 'time');
    for (const [key, label] of [
      ['predictionsEnabled', 'Predictions enabled'],
      ['remindersEnabled', 'Reminders enabled'],
      ['discreet', 'Discreet notification wording'],
    ])
      f(key, label, p[key] ?? key === 'discreet', 'checkbox');
    save = (data) =>
      changeTracking(user, 'cycle/settings', {
        cycleLength: Number(data.get('cycleLength')),
        periodLength: Number(data.get('periodLength')),
        reminderDaysBefore: Number(data.get('reminderDaysBefore')),
        reminderTime: data.get('reminderTime'),
        predictionsEnabled: data.has('predictionsEnabled'),
        remindersEnabled: data.has('remindersEnabled'),
        discreet: data.has('discreet'),
        timezone: 'Asia/Kolkata',
      });
  }
  openEditor(
    `Edit ${kind.replace('-', ' ')}`,
    fields,
    save,
    "Changes affect this person's saved records. Review the details before saving.",
  );
  if (current.id || current.day) {
    const path =
      kind === 'water'
        ? `water/logs/${current.id}`
        : kind === 'medicines'
          ? `medicines/${current.id}`
          : kind === 'periods'
            ? `cycle/periods/${current.id}`
            : kind === 'cycle'
              ? `cycle/entries/${current.day}`
              : null;
    if (path)
      $('editor-fields').append(
        button(
          'Delete this record',
          () => {
            if (confirm('Permanently delete this record?'))
              return changeTracking(user, path, null, 'DELETE').then(() => $('editor').close());
          },
          'danger',
        ),
      );
  }
}
async function homeBanners() {
  reset('Home banners');
  const head = el('div', null, 'section-head');
  head.append(
    el('p', 'Upload landscape JPG, PNG or WebP images. Drafts stay private until published.'),
    button('Upload banner', uploadBanner, ''),
  );
  content.append(head);
  const rev = requestRevision,
    rows = await api('/admin/banners');
  if (rev !== requestRevision) return;
  const grid = el('div', null, 'banner-grid');
  for (const row of rows) {
    const card = el('article', null, 'banner'),
      img = el('img');
    img.alt = row.alt;
    const body = el('div', null, 'banner-body');
    body.append(
      el('h3', row.title),
      el('p', row.alt),
      badge(row.published ? 'Published' : 'Draft'),
    );
    const actions = el('div', null, 'toolbar');
    actions.append(
      button('Edit', () =>
        openEditor(
          'Edit banner',
          [
            field('title', 'Internal title', row.title),
            field('alt', 'Image description', row.alt),
            field('route', 'Opens', row.route ?? '', 'text', routeOptions()),
            field('sortOrder', 'Display order', row.sortOrder, 'number'),
            field('published', 'Published on Home', row.published, 'checkbox'),
          ],
          async (data) => {
            await send(
              `/admin/banners/${row.id}`,
              {
                title: data.get('title'),
                alt: data.get('alt'),
                route: data.get('route') || null,
                sortOrder: Number(data.get('sortOrder')),
                published: data.has('published'),
              },
              'PATCH',
            );
            await homeBanners();
          },
        ),
      ),
      button(row.published ? 'Unpublish' : 'Publish', async () => {
        await send(`/admin/banners/${row.id}`, { published: !row.published }, 'PATCH');
        await homeBanners();
      }),
      button(
        'Delete',
        () =>
          openEditor(
            'Delete banner?',
            [],
            async () => {
              await api(`/admin/banners/${row.id}`, { method: 'DELETE' });
              await homeBanners();
            },
            'The banner will be removed from Home and the dashboard.',
          ),
        'danger',
      ),
    );
    body.append(actions);
    card.append(img, body);
    grid.append(card);
    void api(`/admin/banners/${row.id}/image`, { blob: true })
      .then((blob) => {
        if (rev !== requestRevision) return;
        const url = URL.createObjectURL(blob);
        imageUrls.add(url);
        img.src = url;
      })
      .catch(() => {
        img.alt = 'Preview unavailable';
      });
  }
  content.append(grid);
  if (!rows.length)
    content.append(el('p', 'No banners yet. Upload your first Home banner.', 'empty'));
}
function routeOptions() {
  return [
    ['', 'No link'],
    ['/water', 'Water'],
    ['/medicines', 'Medicines'],
    ['/cycle', 'Cycle'],
    ['/activity', 'Activity'],
    ['/health', 'Health'],
    ['/explore', 'Explore'],
    ['/profile', 'Profile'],
    ['/connected-health', 'Connected health'],
  ];
}
function uploadBanner() {
  openEditor(
    'Upload a Home banner',
    [
      field('title', 'Internal title'),
      field('alt', 'Image description'),
      field('route', 'Opens', '', 'text', routeOptions()),
      field('image', 'Banner image (maximum 4 MB)', '', 'file'),
    ],
    async (data) => {
      if (!data.get('route')) data.delete('route');
      const image = data.get('image');
      if (!image?.size || image.size > 4 * 1024 * 1024)
        throw new Error('Choose an image up to 4 MB.');
      await api('/admin/banners', { method: 'POST', body: data });
      await homeBanners();
    },
    'Recommended ratio: 2.8:1. Keep essential text inside the image safe area. Uploaded images are stored as drafts.',
  );
  $('editor-fields').querySelector('input[type=file]').accept = 'image/jpeg,image/png,image/webp';
}
async function audit() {
  reset('Audit trail');
  const rev = requestRevision,
    rows = await api(`/admin/audit?page=${auditPage}`);
  if (rev !== requestRevision) return;
  const p = panel('Administrative activity');
  p.append(
    el(
      'p',
      'Reads of private records and administrative changes are recorded here. Passwords and health record contents are not written into the audit log.',
    ),
    table(
      ['When', 'Action', 'Outcome', 'Actor', 'Target'],
      rows.map((r) => [
        date(r.createdAt),
        r.action,
        badge(r.outcome),
        r.actorId,
        r.targetId ?? 'New record',
      ]),
    ),
  );
  pager(p, auditPage, rows.length === 50, async (n) => {
    auditPage = n;
    await audit();
  });
  content.append(p);
}
