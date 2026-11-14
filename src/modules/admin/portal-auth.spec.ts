import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
function actualFunctions(names: string[]) {
  const source = ts.createSourceFile(
    'admin.js',
    readFileSync(join(process.cwd(), 'src/modules/admin/public/admin.js'), 'utf8'),
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
    const code = `let tokens={accessToken:'old-access',refreshToken:'old-refresh'},authEpoch=1,renewing=null,requestRevision=0,currentUser=null;const imageUrls=new Set();const content={replaceChildren(){}};const $=()=>({close(){},replaceChildren(){}});${actualFunctions(['api', 'signOut'])};globalThis.run=(path)=>api(path);`;
    const context = vm.createContext({ fetch: fetchMock, FormData, URL, Error, Set });
    vm.runInContext(code, context);
    const methods = context as unknown as { run: (path: string) => Promise<unknown> };
    const delayed = methods.run('/admin/b');
    await methods.run('/admin/a');
    resolveDelayed({ status: 401, ok: false });
    await expect(delayed).resolves.toEqual({ ok: true });
    expect(rotations).toBe(1);
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
    const code = `let tokens={accessToken:'old-access',refreshToken:'old-refresh'},authEpoch=1,renewing=null,requestRevision=0,currentUser=null;const imageUrls=new Set();const content={replaceChildren(){}};const $=()=>({close(){},replaceChildren(){}});${actualFunctions(['api', 'signOut'])};globalThis.run=()=>api('/admin/analytics');globalThis.out=()=>signOut();globalThis.getTokens=()=>tokens;`;
    const sandbox = { fetch: fetchMock, FormData, URL, Error, Set };
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
    expect(revoked).toEqual(['old-refresh', 'new-refresh']);
  });
});
