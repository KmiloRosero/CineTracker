const { useTempDatabase } = require('./helpers.js');
const { registerIpcHandlers } = require('../ipc/handlers.js');
const { clearSession } = require('../utils/session.js');

// Minimal stand-in for Electron's ipcMain: records handlers and lets tests invoke them.
function fakeIpcMain() {
  const handlers = new Map();
  return {
    handle: (channel, fn) => handlers.set(channel, fn),
    invoke: (channel, ...args) => handlers.get(channel)({ sender: null }, ...args),
    channels: () => [...handlers.keys()],
  };
}

let env, ipc;
beforeAll(() => {
  env = useTempDatabase();
  ipc = fakeIpcMain();
  registerIpcHandlers(ipc);
});
afterAll(() => env.cleanup());
beforeEach(() => clearSession());

describe('IPC handlers', () => {
  it('keeps every channel the renderer already uses', () => {
    expect(ipc.channels()).toEqual(expect.arrayContaining([
      'titles:add', 'titles:getAll', 'titles:getById', 'titles:update', 'titles:delete',
      'records:add', 'records:getByTitle', 'records:updateStatus',
      'lists:create', 'lists:addTitle', 'lists:getAll',
      'stats:getGenreCounts', 'stats:getMonthlyWatched', 'stats:getTotalHours',
      'recommendations:get', 'recommendations:getAI',
      'app:getTheme', 'app:setTheme',
      'auth:register', 'auth:login', 'auth:logout', 'auth:getCurrentUser',
    ]));
  });

  it('refuses data changes from guests and returns empty reads', async () => {
    expect(await ipc.invoke('titles:add', { title: 'X', type: 'movie' }))
      .toEqual({ error: 'You need to log in to do that.' });
    expect(await ipc.invoke('titles:getAll', {})).toEqual([]);
    expect(await ipc.invoke('stats:getTotalHours')).toEqual({ totalHours: 0 });
  });

  it('uses the session user for every call after login', async () => {
    const user = await ipc.invoke('auth:register', 'Ana', 'ana-ipc@test.co', 'secret123');
    expect(user).not.toHaveProperty('password_hash');
    const title = await ipc.invoke('titles:add', { title: 'Heat', type: 'movie' });
    expect(title.user_id).toBe(user.id);
    expect(await ipc.invoke('auth:getCurrentUser')).toMatchObject({ id: user.id });
  });

  it('returns validation messages as-is', async () => {
    await ipc.invoke('auth:login', 'ana-ipc@test.co', 'secret123');
    expect(await ipc.invoke('titles:add', { title: '', type: 'movie' })).toEqual({ error: 'Title is required.' });
    expect(await ipc.invoke('app:setTheme', 'neon')).toEqual({ error: 'Theme must be "light" or "dark".' });
  });

  it('hides internal database errors behind a generic message', async () => {
    await ipc.invoke('auth:login', 'ana-ipc@test.co', 'secret123');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    env.db.exec('ALTER TABLE lists RENAME TO lists_tmp');
    try {
      const result = await ipc.invoke('lists:create', 'Broken');
      expect(result).toEqual({ error: 'Something went wrong. Please try again.' });
      expect(JSON.stringify(result)).not.toMatch(/SQLITE|no such table/);
      expect(spy).toHaveBeenCalled();
    } finally {
      env.db.exec('ALTER TABLE lists_tmp RENAME TO lists');
      spy.mockRestore();
    }
  });

  it('logs out after deleting the account', async () => {
    await ipc.invoke('auth:register', 'Temp', 'temp-ipc@test.co', 'secret123');
    expect(await ipc.invoke('auth:deleteAccount', 'wrong')).toEqual({ error: 'Current password is incorrect.' });
    expect(await ipc.invoke('auth:deleteAccount', 'secret123')).toEqual({ deleted: true });
    expect(await ipc.invoke('auth:getCurrentUser')).toBeNull();
  });
});
