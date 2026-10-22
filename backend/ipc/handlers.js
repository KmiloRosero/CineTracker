const titleService            = require('../services/titleService.js');
const recordService           = require('../services/recordService.js');
const listService             = require('../services/listService.js');
const statisticsService       = require('../services/statisticsService.js');
const recommendationService   = require('../services/recommendationService.js');
const aiRecommendationService = require('../services/aiRecommendationService.js');
const discoveryService        = require('../services/discoveryService.js');
const tonightService          = require('../services/tonightService.js');
const describeSearchService   = require('../services/describeSearchService.js');
const cinephileService        = require('../services/cinephileService.js');
const wrappedService          = require('../services/wrappedService.js');
const insightService          = require('../services/insightService.js');
const platformService         = require('../services/platformService.js');
const episodeService          = require('../services/episodeService.js');
const upcomingService         = require('../services/upcomingService.js');
const dataTransferService     = require('../services/dataTransferService.js');
const challengeService        = require('../services/challengeService.js');
const authService             = require('../services/authService.js');
const tmdbService             = require('../services/tmdbService.js');
const apiKeyService           = require('../services/apiKeyService.js');
const rememberService         = require('../services/rememberService.js');
const { canSeal }             = require('../utils/secrets.js');
const { getEnvSource }        = require('../utils/env.js');
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
  ipcMain.handle('titles:getInsight', authed((userId, id, options) =>
    insightService.getTitleInsight(userId, id, { refresh: options?.refresh === true })));
  ipcMain.handle('titles:delete',  authed((userId, id)       => titleService.deleteTitle(userId, id)));

  ipcMain.handle('records:add',          authed((userId, record)             => recordService.addRecord(userId, record)));
  ipcMain.handle('records:getByTitle',   authed((userId, titleId)            => recordService.getRecordsByTitle(userId, titleId)));
  ipcMain.handle('records:updateStatus', authed((userId, id, status, rating) => recordService.updateRecordStatus(userId, id, status, rating)));
  ipcMain.handle('records:update',       authed((userId, id, data)           => recordService.updateRecord(userId, id, data)));
  ipcMain.handle('records:delete',       authed((userId, id)                 => recordService.deleteRecord(userId, id)));

  ipcMain.handle('episodes:getTracker', authed((userId, titleId)         => episodeService.getTracker(userId, titleId)));
  ipcMain.handle('episodes:getSeason',  authed((userId, titleId, season) => episodeService.getSeason(userId, titleId, season)));
  ipcMain.handle('episodes:set',        authed((userId, titleId, episodes, watched) => episodeService.setEpisodes(userId, titleId, episodes, watched)));
  ipcMain.handle('episodes:getNew',     readable((userId)                => episodeService.getNewEpisodes(userId), []));

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
  ipcMain.handle('stats:getChallenge', authed((userId, year)   => challengeService.getChallenge(userId, year ?? undefined)));
  ipcMain.handle('stats:setChallenge', authed((userId, input)  => challengeService.setChallenge(userId, input ?? {})));
  ipcMain.handle('stats:getStreaks',   authed((userId)         => challengeService.getStreaks(userId)));
  ipcMain.handle('stats:getYearInReview', authed((userId, year, options) =>
    wrappedService.getYearInReview(userId, year, { refresh: options?.refresh === true })));
  ipcMain.handle('stats:getCinephileProfile', authed((userId, options) =>
    cinephileService.getCinephileProfile(userId, { refresh: options?.refresh === true })));

  ipcMain.handle('recommendations:get',   authed((userId) => recommendationService.getRecommendations(userId)));
  ipcMain.handle('recommendations:getAI', authed((userId, options) =>
    aiRecommendationService.getAIRecommendations(userId, { refresh: options?.refresh === true })));

  // ── Descubrir ─────────────────────────────────────────────────────────────
  ipcMain.handle('discover:getStyles', readable((userId) =>
    discoveryService.getStyles(userId, { platforms: platformService.getPlatformIds(userId) }), { styles: [], modifiers: [], counts: null }));
  ipcMain.handle('discover:generate',  authed((userId, params, options) =>
    discoveryService.generateList(userId, params ?? {}, { refresh: options?.refresh === true, platforms: platformService.getPlatformIds(userId) })));
  ipcMain.handle('discover:save',         authed((userId, payload)        => discoveryService.saveList(userId, payload ?? {})));
  ipcMain.handle('discover:dismiss',      authed((userId, item)           => discoveryService.dismiss(userId, item ?? {})));
  ipcMain.handle('discover:undismiss',    authed((userId, tmdbId, type)   => discoveryService.undismiss(userId, tmdbId, type)));
  ipcMain.handle('discover:tonight',      authed(async (userId, input, options) => {
    const platforms = platformService.getPlatformIds(userId);
    // "only on my platforms" also filters pending titles, which needs their providers
    const availableIds = input?.platformsOnly && platforms.length
      ? new Set(Object.keys((await platformService.getAvailability(userId)).available).map(Number))
      : null;
    return tonightService.pickTonight(userId, input ?? {}, { refresh: options?.refresh === true, platforms, availableIds });
  }));

  // ── Estrenos y seguidos ───────────────────────────────────────────────────
  ipcMain.handle('upcoming:get',            authed((userId)               => upcomingService.getUpcoming(userId)));
  ipcMain.handle('upcoming:getFollows',     readable((userId)             => upcomingService.getFollows(userId), { people: [], genres: [] }));
  ipcMain.handle('upcoming:follow',         authed((userId, target)       => upcomingService.follow(userId, target ?? {})));
  ipcMain.handle('upcoming:unfollow',       authed((userId, target)       => upcomingService.unfollow(userId, target ?? {})));
  ipcMain.handle('upcoming:getTitlePeople', authed((userId, tmdbId, type) => upcomingService.getTitlePeople(userId, tmdbId, type)));

  // ── Import and export ─────────────────────────────────────────────────────
  ipcMain.handle('data:preview', authed((_userId, text, options) => dataTransferService.preview(text, options ?? {})));
  ipcMain.handle('data:import',  authed((userId, rows)          => dataTransferService.importBatch(userId, rows)));
  ipcMain.handle('data:export',  authed((userId, format) => {
    if (format === 'letterboxd') return dataTransferService.exportLetterboxd(userId);
    if (format === 'cinetracker') return dataTransferService.exportCineTracker(userId);
    throw new Error('Formato de exportación desconocido.');
  }));

  // ── Mis plataformas ───────────────────────────────────────────────────────
  ipcMain.handle('platforms:getCatalog',      safe(() => tmdbService.getProviderCatalog()));
  ipcMain.handle('platforms:get',             readable((userId) => platformService.getPlatforms(userId), []));
  ipcMain.handle('platforms:set',             authed((userId, platforms) => {
    const saved = platformService.setPlatforms(userId, platforms);
    discoveryService.clearCache();
    tonightService.clearCache();
    return saved;
  }));
  ipcMain.handle('platforms:getAvailability', authed((userId) => platformService.getAvailability(userId)));
  ipcMain.handle('discover:describe',     authed((_userId, query)         => describeSearchService.findByDescription(query)));
  ipcMain.handle('discover:getDismissed', authed((userId)                 => discoveryService.getDismissed(userId)));

  // TMDB metadata is public, so guests can browse trending titles and search.
  ipcMain.handle('tmdb:search',      safe((query)        => tmdbService.search(query)));
  ipcMain.handle('tmdb:getDetails',  safe((tmdbId, type) => tmdbService.getDetails(tmdbId, type)));
  ipcMain.handle('tmdb:getTrending', safe((limit)        => tmdbService.getTrending(limit)));
  ipcMain.handle('tmdb:getTrailer',  safe((tmdbId, type) => tmdbService.getTrailer(tmdbId, type)));
  ipcMain.handle('tmdb:getRelated',  safe((tmdbId, type) => tmdbService.getRelated(tmdbId, type)));
  ipcMain.handle('tmdb:getWatchProviders', safe((tmdbId, type, title) => tmdbService.getWatchProviders(tmdbId, type, title)));

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
  // `remember` keeps the user signed in on this computer (rememberService).
  function startSession(user, remember) {
    setSession(user.id);
    if (remember === true) rememberService.remember(user.id);
    else rememberService.forget();
    return user;
  }

  ipcMain.handle('auth:register', safe(async (name, email, password, remember) =>
    startSession(await authService.register(name, email, password), remember)));

  ipcMain.handle('auth:login', safe(async (email, password, remember) =>
    startSession(await authService.login(email, password), remember)));

  ipcMain.handle('auth:logout', safe(() => {
    clearSession();
    rememberService.forget();
    return { ok: true };
  }));

  ipcMain.handle('auth:getCurrentUser', safe(() => {
    let userId = getSession();
    if (!userId) {
      userId = rememberService.restore();
      if (!userId) return null;
      setSession(userId);
    }
    return authService.getCurrentUser(userId);
  }));

  // ── Profile & account ─────────────────────────────────────────────────────
  ipcMain.handle('auth:updateProfile',  authed((userId, data) => authService.updateProfile(userId, data)));
  ipcMain.handle('auth:changePassword', authed((userId, currentPassword, newPassword) =>
    authService.changePassword(userId, currentPassword, newPassword)));
  ipcMain.handle('auth:deleteAccount',  authed(async (userId, password) => {
    const result = await authService.deleteAccount(userId, password);
    clearSession();
    rememberService.forget();
    return result;
  }));

  // ── API keys (Perfil > Claves de API) ─────────────────────────────────────
  // The renderer never gets a key back: only where each one comes from.
  ipcMain.handle('settings:getApiKeys', safe(() => ({
    canSave: canSeal(),
    keys: Object.fromEntries(Object.entries(apiKeyService.KEYS).map(([name, { env }]) =>
      [name, { source: getEnvSource(env) }])),
  })));
  ipcMain.handle('settings:setApiKey', authed((_userId, name, value) => {
    const result = apiKeyService.setKey(name, value);
    aiRecommendationService.clearCache();
    discoveryService.clearCache();
    tonightService.clearCache();
    describeSearchService.clearCache();
    tmdbService.clearTrailerCache();
    return result;
  }));
  ipcMain.handle('settings:clearApiKey', authed((_userId, name) => {
    const result = apiKeyService.clearKey(name);
    aiRecommendationService.clearCache();
    discoveryService.clearCache();
    tonightService.clearCache();
    describeSearchService.clearCache();
    return result;
  }));
  ipcMain.handle('settings:testApiKey', safe((name) => {
    if (name === 'tmdb') return tmdbService.ping();
    if (name === 'gemini') return aiRecommendationService.pingGemini();
    throw new Error('Clave de API desconocida.');
  }));
}

module.exports = { registerIpcHandlers };
