'use strict';

const byId = (id) => document.getElementById(id);
let snapshot = null;
let polling = false;
let timer;
byId('base-url').textContent = `${location.origin}/api/v1`;

async function api(path) {
  const response = await fetch(`/api/v1/${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(path === 'ready' ? 15000 : 8000),
  });
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(
      `HTTP ${response.status}: expected API JSON, received a hosting page or another service. Check the domain routing and startup command.`,
    );
  }
  return { response, data: await response.json() };
}

function render() {
  if (!snapshot) return;
  const values = {
    'api-count': 'apiRequests',
    'client-errors': 'clientErrors',
    'server-errors': 'serverErrors',
    'probe-count': 'probes',
  };
  for (const [id, key] of Object.entries(values))
    byId(id).textContent = snapshot.counts[key].toLocaleString();
  byId('instance').textContent =
    `Process ${snapshot.instanceId} · Started ${new Date(snapshot.startedAt).toLocaleString()}`;
  const events = snapshot.recent.filter(
    (event) => byId('include-probes').checked || event.kind === 'api',
  );
  const body = byId('requests');
  body.replaceChildren();
  if (!events.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.className = 'empty';
    cell.textContent =
      'No matching requests retained yet. Try an action in the APK; include diagnostic probes to see connection checks.';
    return;
  }
  for (const event of events) {
    const row = body.insertRow();
    for (const value of [
      new Date(event.timestamp).toLocaleTimeString(),
      event.method,
      event.route,
      event.status,
      `${event.durationMs} ms`,
    ]) {
      row.insertCell().textContent = String(value);
    }
    row.cells[3].className = event.status >= 400 ? 'fail' : 'pass';
  }
}

async function refresh() {
  if (polling || document.hidden) return;
  polling = true;
  try {
    const { response, data } = await api('diagnostics');
    if (
      !response.ok ||
      data.service !== 'arogio-health-api' ||
      !data.counts ||
      !Array.isArray(data.recent)
    ) {
      throw new Error(
        `HTTP ${response.status}: this host did not return the Arogio request monitor. Deploy this backend and check the /api/v1 routing.`,
      );
    }
    snapshot = data;
    byId('connection').textContent = 'API connected';
    byId('connection').className = 'connection';
    byId('connection-error').hidden = true;
    byId('updated').textContent = new Date(data.timestamp).toLocaleString();
    render();
  } catch (error) {
    byId('connection').textContent = 'API connection failed';
    byId('connection').className = 'connection failed';
    byId('connection-error').textContent =
      `Monitor unavailable. ${error.message} Retained rows, if any, are from the last successful update. Retrying every 5 seconds.`;
    byId('connection-error').hidden = false;
  } finally {
    polling = false;
  }
}

async function checkConnections() {
  const button = byId('check');
  button.disabled = true;
  button.textContent = 'Checking…';
  byId('check-message').textContent = 'Checking API process, database and test request…';
  let passed = 0;
  await Promise.all(
    ['health', 'ready', 'ping'].map(async (id) => {
      const cell = byId(id);
      cell.textContent = 'Checking…';
      cell.className = '';
      try {
        const { response, data } = await api(id === 'ping' ? 'diagnostics/ping' : id);
        const valid =
          id === 'ready'
            ? data.status === 'ready' && data.checks?.database === 'up'
            : data.status === 'ok' && (id !== 'ping' || data.service === 'arogio-health-api');
        if (!response.ok || !valid)
          throw new Error(
            `HTTP ${response.status}: ${id === 'ready' ? 'database not ready; check server logs and migrations' : 'unexpected API response'}`,
          );
        cell.textContent = `Passed · HTTP ${response.status}`;
        cell.className = 'pass';
        passed += 1;
      } catch (error) {
        cell.textContent = error.message;
        cell.className = 'fail';
      }
    }),
  );
  byId('check-message').textContent =
    `${passed} of 3 checks passed. These are diagnostic probes; they do not increase the application API request count.`;
  button.disabled = false;
  button.textContent = 'Run connection checks';
  await refresh();
}

function schedule() {
  clearInterval(timer);
  if (!document.hidden) {
    void refresh();
    timer = setInterval(() => void refresh(), 5000);
  }
}
byId('check').addEventListener('click', () => void checkConnections());
byId('include-probes').addEventListener('change', render);
document.addEventListener('visibilitychange', schedule);
schedule();
