const { useTempDatabase } = require('./helpers.js');
const { registerIpcHandlers } = require('../ipc/handlers.js');
const { clearSession, getSession } = require('../utils/session.js');
const { configureSecrets, seal, unseal } = require('../utils/secrets.js');
const { getEnv } = require('../utils/env.js');
const settings = require('../repositories/settingsRepository.js');

// Reversible stand-in for safeStorage: enough to prove values are not stored in clear.
const fakeCipher = {
  encrypt: (text) => Buffer.from(`sealed:${[...text].reverse().join('')}`),
  decrypt: (buf) => {
    const s = buf.toString();
    if (!s.startsWith('sealed:')) throw new Error('not sealed here');
    return [...s.slice(7)].reverse().join('');
  },
};

function fakeIpcMain() {
  const handlers = new Map();
  return {
    handle: (channel, fn) => handlers.set(channel, fn),
    invoke: (channel, ...args) => handlers.get(channel)({ sender: null }, ...args),
  };
}

let env, ipc;
const KEY = 'tmdb-key-0123456789abcdef';

beforeAll(() => {
  env = useTempDatabase();
  ipc = fakeIpcMain();
  registerIpcHandlers(ipc);
});
afterAll(() => { configureSecrets(null); env.cleanup(); });
beforeEach(() => { configureSecrets(fakeCipher); clearSession(); });

describe('secrets', () => {
  it('seal values so they are not stored in clear and open only with the same cipher', () => {
    const sealed = seal('top secret');
    expect(sealed).not.toContain('top secret');
    expect(unseal(sealed)).toBe('top secret');
    configureSecrets({ encrypt: fakeCipher.encrypt, decrypt: () => { throw new Error('other machine'); } });
    expect(unseal(sealed)).toBeNull();
  });

  it('refuse to seal when the OS offers no encryption', () => {
    configureSecrets(null);
    expect(() => seal('x')).toThrow('no permite guardar datos cifrados');
  });
});

describe('API keys saved in the app', () => {
  const saved = process.env.TMDB_API_KEY;
  beforeEach(() => { delete process.env.TMDB_API_KEY; });
  afterEach(() => { process.env.TMDB_API_KEY = saved ?? ''; settings.remove('apikey:tmdb'); });

  it('are saved sealed, used by getEnv, reported by source and never returned', async () => {
    await ipc.invoke('auth:register', 'Ana', `ana${Date.now()}@test.co`, 'secret123');
    expect(await ipc.invoke('settings:setApiKey', 'tmdb', `  ${KEY}  `)).toEqual({ ok: true });

    expect(settings.get('apikey:tmdb')).not.toContain(KEY);
    expect(getEnv('TMDB_API_KEY')).toBe(KEY);

    const status = await ipc.invoke('settings:getApiKeys');
    expect(status.canSave).toBe(true);
    expect(status.keys.tmdb).toEqual({ source: 'app' });
    expect(JSON.stringify(status)).not.toContain(KEY);

    expect(await ipc.invoke('settings:clearApiKey', 'tmdb')).toEqual({ ok: true });
    expect((await ipc.invoke('settings:getApiKeys')).keys.tmdb.source).not.toBe('app');
  });

  it('take precedence over backend/.env but not over the process environment', async () => {
    await ipc.invoke('auth:register', 'Bo', `bo${Date.now()}@test.co`, 'secret123');
    await ipc.invoke('settings:setApiKey', 'tmdb', KEY);
    process.env.TMDB_API_KEY = 'from-process-env-123456';
    expect(getEnv('TMDB_API_KEY')).toBe('from-process-env-123456');
  });

  it('reject guests, unknown names and malformed keys', async () => {
    expect(await ipc.invoke('settings:setApiKey', 'tmdb', KEY)).toEqual({ error: 'Necesitas iniciar sesión para hacer eso.' });
    await ipc.invoke('auth:register', 'Cy', `cy${Date.now()}@test.co`, 'secret123');
    expect((await ipc.invoke('settings:setApiKey', 'openai', KEY)).error).toBe('Clave de API desconocida.');
    expect((await ipc.invoke('settings:setApiKey', 'tmdb', 'short')).error).toMatch('no parece válida');
    expect((await ipc.invoke('settings:setApiKey', 'tmdb', 'has spaces in the middle of it')).error).toMatch('sin espacios');
    expect((await ipc.invoke('settings:testApiKey', 'openai')).error).toBe('Clave de API desconocida.');
  });
});

describe('keep me signed in', () => {
  // A restart: the in-memory session is gone, the database and settings remain.
  const restart = () => clearSession();

  it('restores the user after a restart only when asked to remember', async () => {
    const email = `dee${Date.now()}@test.co`;
    const user = await ipc.invoke('auth:register', 'Dee', email, 'secret123', true);
    restart();
    expect((await ipc.invoke('auth:getCurrentUser')).id).toBe(user.id);
    expect(getSession()).toBe(user.id);

    await ipc.invoke('auth:login', email, 'secret123', false);
    restart();
    expect(await ipc.invoke('auth:getCurrentUser')).toBeNull();
  });

  it('forgets the session on logout and when the token cannot be opened', async () => {
    const email = `eve${Date.now()}@test.co`;
    await ipc.invoke('auth:register', 'Eve', email, 'secret123', true);
    await ipc.invoke('auth:logout');
    restart();
    expect(await ipc.invoke('auth:getCurrentUser')).toBeNull();

    await ipc.invoke('auth:login', email, 'secret123', true);
    restart();
    configureSecrets({ encrypt: fakeCipher.encrypt, decrypt: () => { throw new Error('copied database'); } });
    expect(await ipc.invoke('auth:getCurrentUser')).toBeNull();
    expect(settings.get('remembered_session')).toBeNull();
  });

  it('expires after its time and is removed with the account', async () => {
    const db = env.db;
    const email = `fay${Date.now()}@test.co`;
    const user = await ipc.invoke('auth:login', email, 'x', true).catch(() => null);
    expect(user.error).toBeDefined(); // no such account yet

    const fay = await ipc.invoke('auth:register', 'Fay', email, 'secret123', true);
    db.prepare("UPDATE remembered_sessions SET expires_at = datetime('now', '-1 day') WHERE user_id = ?").run(fay.id);
    restart();
    expect(await ipc.invoke('auth:getCurrentUser')).toBeNull();

    await ipc.invoke('auth:login', email, 'secret123', true);
    await ipc.invoke('auth:deleteAccount', 'secret123');
    expect(db.prepare('SELECT COUNT(*) AS n FROM remembered_sessions WHERE user_id = ?').get(fay.id).n).toBe(0);
    restart();
    expect(await ipc.invoke('auth:getCurrentUser')).toBeNull();
  });

  it('stores only a hash of the token in the database', async () => {
    await ipc.invoke('auth:register', 'Gus', `gus${Date.now()}@test.co`, 'secret123', true);
    const token = unseal(settings.get('remembered_session'));
    const row = env.db.prepare('SELECT token_hash FROM remembered_sessions ORDER BY created_at DESC LIMIT 1').get();
    expect(token).toHaveLength(43);
    expect(row.token_hash).not.toBe(token);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
