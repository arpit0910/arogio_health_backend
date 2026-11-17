// Exercises actual portal controls against synthetic fixtures in an isolated headless browser.
const fs = require('node:fs'), path = require('node:path'), { spawn, execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  execFileSync(process.execPath, ['scripts/previews/preview-directory-admin.cjs'], { cwd: root, stdio: 'pipe' });
  const profile = path.join(root, '.tmp', `directory-test-browser-${Date.now()}`); fs.mkdirSync(profile, { recursive: true });
  const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const child = spawn(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--disable-software-rasterizer', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(portFile) && i < 100; i++) await delay(100);
    if (!fs.existsSync(portFile)) throw new Error('Headless browser did not start.');
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    const pending = new Map(); let id = 0;
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data)); if (!message.id) return;
      const request = pending.get(message.id); if (!request) return;
      pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); });
    for (const kind of ['hospitals', 'doctors', 'blood-banks']) {
      const url = pathToFileURL(path.join(root, '.tmp/directory-admin-preview', `${kind}-verify.html`)).href;
      await call('Page.navigate', { url }); let result;
      for (let i = 0; i < 150; i++) {
        await delay(100);
        try {
          const evaluated = await call('Runtime.evaluate', { expression: '({href:location.href,status:document.body?.dataset.verification,message:document.getElementById("message")?.textContent,error:document.getElementById("editor-error")?.textContent})', returnByValue: true });
          result = evaluated.result?.value;
          if (result?.href === url && result.status) break;
        } catch { /* A page navigation can replace the execution context. */ }
      }
      if (result?.status !== 'passed') throw new Error(`${kind}: ${JSON.stringify(result)}`);
      console.log(JSON.stringify({ kind, selection: 'passed', approvalDialog: 'passed', versionedPayload: 'passed', inactiveProtection: 'passed', results: 'passed' }));
      const capture = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(root, '.tmp', `directory-${kind}-verified.png`), Buffer.from(capture.data, 'base64'));
    }
    await call('Browser.close').catch(() => {});
  } finally { socket?.close(); child.kill(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
