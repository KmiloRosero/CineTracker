const titleService            = require('../services/titleService.js');
const recordService           = require('../services/recordService.js');
const listService             = require('../services/listService.js');
const statisticsService       = require('../services/statisticsService.js');
const recommendationService   = require('../services/recommendationService.js');
const aiRecommendationService = require('../services/aiRecommendationService.js');
const authService             = require('../services/authService.js');
const tmdbService             = require('../services/tmdbService.js');
const { getDb }               = require('../db/database.js');
const { setSession, getSession, clearSession } = require('../utils/session.js');

const INTERNAL_ERROR = 'Algo salió mal. Inténtalo de nuevo.';

// Validation errors thrown by services carry user-facing messages. Database and
// programming errors do not: log them here and send the renderer a generic one.
function toRendererError(err) {
  const internal = String(err?.code ?? '').startsWith('SQLITE')
    || err instanceof TypeError
    || err instanceof ReferenceError
    || err instanceof RangeError;
  if (internal) {
    console.error('[ipc]', err);
    return { error: INTERNAL_ERROR };
  }
  return { error: err?.message ?? INTERNAL_ERROR };
}

function safe(fn) {
  return async (_event, ...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      return toRendererError(err);
    }
  };
}

// Changes data or is personalized: requires a session, receives its user id.
function authed(fn) {
  return safe((...args) => {
    const userId = getSession();
    if (!userId) throw new Error('Necesitas iniciar sesión para hacer eso.');
    return fn(userId, ...args);
  });
}

// Read-only: guests get `guestValue` instead of an error so pages render empty.
function readable(fn, guestValue) {
  return safe((...args) => {
    const userId = getSession();
    if (!userId) return guestValue;
    return fn(userId, ...args);
  });
}

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('titles:add',     authed((userId, title)    => titleService.addTitle(userId, title)));
  ipcMain.handle('titles:getAll',  readable((userId, filters) => titleService.getAllTitles(userId, filters), []));
  ipcMain.handle('titles:getById', authed((userId, id)       => titleService.getTitleWithRecords(userId, id)));
  ipcMain.handle('titles:update',  authed((userId, id, data) => titleService.updateTitle(userId, id, data)));
  ipcMain.handle('titles:delete',  authed((userId, id)       => titleService.deleteTitle(userId, id)));

  ipcMain.handle('records:add',          authed((userId, record)             => recordService.addRecord(userId, record)));
  ipcMain.handle('records:getByTitle',   authed((userId, titleId)            => recordService.getRecordsByTitle(userId, titleId)));
  ipcMain.handle('records:updateStatus', authed((userId, id, status, rating) => recordService.updateRecordStatus(userId, id, status, rating)));
  ipcMain.handle('records:update',       authed((userId, id, data)           => recordService.updateRecord(userId, id, data)));
  ipcMain.handle('records:delete',       authed((userId, id)                 => recordService.deleteRecord(userId, id)));

  ipcMain.handle('lists:create',   authed((userId, name)            => listService.createList(userId, name)));
  ipcMain.handle('lists:addTitle', authed((userId, listId, titleId) => listService.addTitleToList(userId, listId, titleId)));
  ipcMain.handle('lists:getAll',   readable((userId)                => listService.getAllLists(userId), []));
  ipcMain.handle('lists:getById',     authed((userId, id)               => listService.getList(userId, id)));
  ipcMain.handle('lists:rename',      authed((userId, id, name)         => listService.renameList(userId, id, name)));
  ipcMain.handle('lists:delete',      authed((userId, id)               => listService.deleteList(userId, id)));
  ipcMain.handle('lists:removeTitle', authed((userId, listId, titleId)  => listService.removeTitleFromList(userId, listId, titleId)));
  ipcMain.handle('lists:getForTitle', authed((userId, titleId)          => listService.getListIdsForTitle(userId, titleId)));

  ipcMain.handle('stats:getGenreCounts',    readable((userId) => statisticsService.getGenreCounts(userId), []));
  ipcMain.handle('stats:getMonthlyWatched', readable((userId) => statisticsService.getMonthlyWatched(userId), []));
  ipcMain.handle('stats:getTotalHours',     readable((userId) => statisticsService.getTotalHours(userId), { totalHours: 0 }));
  ipcMain.handle('stats:getOverview',       authed((userId)   => statisticsService.getOverview(userId)));

  ipcMain.handle('recommendations:get',   authed((userId) => recommendationService.getRecommendations(userId)));
  ipcMain.handle('recommendations:getAI', authed((userId, options) =>
    aiRecommendationService.getAIRecommendations(userId, { refresh: options?.refresh === true })));

  // TMDB metadata is public, so guests can browse trending titles and search.
  ipcMain.handle('tmdb:search',      safe((query)        => tmdbService.search(query)));
  ipcMain.handle('tmdb:getDetails',  safe((tmdbId, type) => tmdbService.getDetails(tmdbId, type)));
  ipcMain.handle('tmdb:getTrending', safe((limit)        => tmdbService.getTrending(limit)));
  ipcMain.handle('tmdb:getTrailer',  safe((tmdbId, type) => tmdbService.getTrailer(tmdbId, type)));

  // Theme is per installation, so it works before anyone logs in.
  ipcMain.handle('app:getTheme', safe(() => {
    return getDb().prepare('SELECT value FROM settings WHERE key = ?').get('theme')?.value;
  }));
  ipcMain.handle('app:setTheme', safe((theme) => {
    if (theme !== 'light' && theme !== 'dark') throw new Error('El tema debe ser "light" o "dark".');
    getDb()
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('theme', theme);
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

  // ── Profile & account ─────────────────────────────────────────────────────
  ipcMain.handle('auth:updateProfile',  authed((userId, data) => authService.updateProfile(userId, data)));
  ipcMain.handle('auth:changePassword', authed((userId, currentPassword, newPassword) =>
    authService.changePassword(userId, currentPassword, newPassword)));
  ipcMain.handle('auth:deleteAccount',  authed(async (userId, password) => {
    const result = await authService.deleteAccount(userId, password);
    clearSession();
    return result;
  }));
}

module.exports = { registerIpcHandlers };
