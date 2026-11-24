import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
function actualFunctions(names: string[]) {
  const source = ts.createSourceFile(
    'admin.js',
    readFileSync(join(process.cwd(), 'src/modules/administration/public/admin.js'), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  return source.statements
    .filter(
      (statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) &&
        !!statement.name &&
        names.includes(statement.name.text),
    )
    .map((statement) => statement.getText(source))
    .join('\n');
}
describe('portal session lifecycle', () => {
  it('upgrades old section links to the module URL and preserves browser history', () => {
    const location = new URL('https://backend.arogio.com/admin/#doctors');
    const replaceState = jest.fn(), pushState = jest.fn();
    const context = vm.createContext({ URL, window: { location, history: { replaceState, pushState } } });
    vm.runInContext(`
      const portalPages = new Set(['doctors', 'hospitals']);
      ${actualFunctions(['portalPageFromUrl', 'syncPortalUrl'])}
      let page = portalPageFromUrl();
      syncPortalUrl();
    `, context);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(String(replaceState.mock.calls[0]?.[2])).toBe('https://backend.arogio.com/admin/doctors');
    expect(pushState).not.toHaveBeenCalled();
    location.href = String(replaceState.mock.calls[0]?.[2]);
    expect(vm.runInContext('portalPageFromUrl()', context)).toBe('doctors');
    vm.runInContext("page = 'hospitals'; syncPortalUrl()", context);
    expect(String(pushState.mock.calls[0]?.[2])).toBe('https://backend.arogio.com/admin/hospitals');
  });

  it('retries a delayed old-token 401 with current tokens instead of rotating twice', async () => {
    let resolveDelayed: (value: unknown) => void = () => {};
    let rotations = 0;
    const fetchMock = jest.fn((url: string, options?: { headers?: { Authorization?: string } }) => {
      if (url.endsWith('/auth/tokens/refresh')) {
        rotations++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
        });
      }
      if (options?.headers?.Authorization === 'Bearer new-access')
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      if (url.endsWith('/admin/b'))
        return new Promise((resolve) => {
          resolveDelayed = resolve;
        });
      return Promise.resolve({ status: 401, ok: false });
    });
    const code = `let tokens={accessToken:'old-access',refreshToken:'old-refresh'},authEpoch=1,renewing=null,requestRevision=0,currentUser=null;const imageUrls=new Set();const content={replaceChildren(){}};const $=()=>({close(){},replaceChildren(){}});${actualFunctions(['api', 'signOut', 'savePortalSession', 'readPortalSession'])};globalThis.run=(path)=>api(path);`;
    const stored = new Map<string, string>();
    const sessionStorage = { setItem: (key: string, value: string) => stored.set(key, value), getItem: (key: string) => stored.get(key) };
    const context = vm.createContext({ fetch: fetchMock, FormData, URL, Error, Set, sessionStorage });
    vm.runInContext(code, context);
    const methods = context as unknown as { run: (path: string) => Promise<unknown> };
    const delayed = methods.run('/admin/b');
    await methods.run('/admin/a');
    resolveDelayed({ status: 401, ok: false });
    await expect(delayed).resolves.toEqual({ ok: true });
    expect(rotations).toBe(1);
    expect(vm.runInContext('tokens = null; readPortalSession()', context)).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });

  it('does not resurrect tokens when sign-out races a rotating refresh', async () => {
    let resolveRefresh: (value: unknown) => void = () => {};
    let signalStarted: () => void = () => {};
    const refreshStarted = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const revoked: string[] = [];
    const fetchMock = jest.fn((url: string, options?: { body?: string }) => {
      if (url.endsWith('/auth/tokens/refresh'))
        return new Promise((resolve) => {
          resolveRefresh = resolve;
          signalStarted();
        });
      if (url.endsWith('/auth/logout')) {
        revoked.push((JSON.parse(options!.body!) as { refreshToken: string }).refreshToken);
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ status: 401, ok: false });
    });
    const code = `let tokens={accessToken:'old-access',refreshToken:'old-refresh'},authEpoch=1,renewing=null,requestRevision=0,currentUser=null;const imageUrls=new Set();const content={replaceChildren(){}};const $=()=>({close(){},replaceChildren(){}});${actualFunctions(['api', 'signOut', 'savePortalSession', 'readPortalSession'])};globalThis.run=()=>api('/admin/analytics');globalThis.out=()=>signOut();globalThis.getTokens=()=>tokens;`;
    const stored = new Map([['arogio.admin.session', '{"accessToken":"old-access","refreshToken":"old-refresh"}']]);
    const sessionStorage = { setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) };
    const sandbox = { fetch: fetchMock, FormData, URL, Error, Set, sessionStorage };
    const context = vm.createContext(sandbox);
    vm.runInContext(code, context);
    const methods = context as unknown as {
      run: () => Promise<unknown>;
      out: () => Promise<void>;
      getTokens: () => unknown;
    };
    const pending = methods.run();
    await refreshStarted;
    await methods.out();
    resolveRefresh({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
    });
    await expect(pending).rejects.toThrow('Session changed');
    expect(methods.getTokens()).toBeNull();
    expect(stored.size).toBe(0);
    expect(revoked).toEqual(['old-refresh', 'new-refresh']);
  });
});
