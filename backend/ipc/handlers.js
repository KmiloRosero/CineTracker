const titleService          = require('../services/titleService.js');
const statisticsService     = require('../services/statisticsService.js');
const recommendationService = require('../services/recommendationService.js');
const aiRecommendationService = require('../services/aiRecommendationService.js');
const authService           = require('../services/authService.js');
const recordRepository      = require('../repositories/recordRepository.js');
const listRepository        = require('../repositories/listRepository.js');
const { getDb }             = require('../db/database.js');
const { setSession, getSession, clearSession } = require('../utils/session.js');

function safe(fn) {
  return async (_event, ...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      return { error: err.message ?? String(err) };
    }
  };
}

// Guests can browse read-only; anything that changes data or is personalized
// requires a logged-in session. The UI gates these too, this is the real guard.
function authed(fn) {
  return safe((...args) => {
    if (!getSession()) throw new Error('You need to log in to do that.');
    return fn(...args);
  });
}

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('titles:add',     authed((title)     => titleService.addTitle(title)));
  ipcMain.handle('titles:getAll',  safe((filters)     => titleService.getAllTitles(filters)));
  ipcMain.handle('titles:getById', safe((id)          => titleService.getTitleWithRecords(id)));
  ipcMain.handle('titles:update',  authed((id, data)  => titleService.updateTitle(id, data)));
  ipcMain.handle('titles:delete',  authed((id)        => titleService.deleteTitle(id)));

  ipcMain.handle('records:add',          authed((record)             => recordRepository.create(record)));
  ipcMain.handle('records:getByTitle',   safe((titleId)              => recordRepository.findByTitleId(titleId)));
  ipcMain.handle('records:updateStatus', authed((id, status, rating) => recordRepository.updateStatus(id, status, rating)));

  ipcMain.handle('lists:create',   authed((name)            => listRepository.create(name)));
  ipcMain.handle('lists:addTitle', authed((listId, titleId) => listRepository.addTitle(listId, titleId)));
  ipcMain.handle('lists:getAll',   safe(()                  => listRepository.findAllWithTitles()));

  ipcMain.handle('stats:getGenreCounts',    safe(() => statisticsService.getGenreCounts()));
  ipcMain.handle('stats:getMonthlyWatched', safe(() => statisticsService.getMonthlyWatched()));
  ipcMain.handle('stats:getTotalHours',     safe(() => statisticsService.getTotalHours()));

  ipcMain.handle('recommendations:get',   authed(() => recommendationService.getRecommendations()));
  ipcMain.handle('recommendations:getAI', authed(() => aiRecommendationService.getAIRecommendations()));

  ipcMain.handle('app:getTheme', safe(() => {
    return getDb().prepare('SELECT value FROM settings WHERE key = ?').get('theme')?.value;
  }));
  ipcMain.handle('app:setTheme', safe((theme) => {
    getDb()
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('theme', String(theme));
    return { ok: true };
  }));

  // ── Auth ──────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:register', safe(async (name, email, password) => {
    const user = await authService.register(name, email, password);
    setSession(user.id);
    return user;
  }));

  ipcMain.handle('auth:login', safe(async (email, password) => {
    const user = await authService.login(email, password);
    setSession(user.id);
    return user;
  }));

  ipcMain.handle('auth:logout', safe(() => {
    clearSession();
    return { ok: true };
  }));

  ipcMain.handle('auth:getCurrentUser', safe(() => {
    const userId = getSession();
    if (!userId) return null;
    return authService.getCurrentUser(userId);
  }));
}

module.exports = { registerIpcHandlers };
