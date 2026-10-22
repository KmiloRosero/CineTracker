const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Titles ──────────────────────────────────────────────────────────────
  /** @param {object} title */
  addTitle:     (title)        => ipcRenderer.invoke('titles:add', title),
  /** @param {{ status?: string, type?: string, search?: string }} [filters] */
  getAllTitles:  (filters)     => ipcRenderer.invoke('titles:getAll', filters),
  /** @param {number} id — Returns { title, records } */
  getTitleById:  (id)          => ipcRenderer.invoke('titles:getById', id),
  /** @param {number} id @param {object} data */
  updateTitle:   (id, data)    => ipcRenderer.invoke('titles:update', id, data),
  /** @param {number} id */
  deleteTitle:   (id)          => ipcRenderer.invoke('titles:delete', id),

  // ── Records ──────────────────────────────────────────────────────────────
  /** @param {object} record */
  addRecord:          (record)              => ipcRenderer.invoke('records:add', record),
  /** @param {number} titleId */
  getRecordsByTitle:  (titleId)             => ipcRenderer.invoke('records:getByTitle', titleId),
  /** @param {number} id @param {string} status @param {number|null} [rating] */
  updateRecordStatus: (id, status, rating)  => ipcRenderer.invoke('records:updateStatus', id, status, rating),
  /** @param {number} id @param {{ watched_date?, rating?, platform?, status?, note? }} data */
  updateRecord:       (id, data)              => ipcRenderer.invoke('records:update', id, data),
  /** @param {number} id */
  deleteRecord:       (id)                    => ipcRenderer.invoke('records:delete', id),

  // ── Lists ────────────────────────────────────────────────────────────────
  /** @param {string} name */
  createList:     (name)              => ipcRenderer.invoke('lists:create', name),
  /** @param {number} listId @param {number} titleId */
  addTitleToList: (listId, titleId)   => ipcRenderer.invoke('lists:addTitle', listId, titleId),
  /** Returns lists with their titles eagerly loaded */
  getAllLists:     ()                  => ipcRenderer.invoke('lists:getAll'),
  /** @param {number} id — Returns the list with its titles */
  getList:            (id)              => ipcRenderer.invoke('lists:getById', id),
  /** @param {number} id @param {string} name */
  renameList:         (id, name)        => ipcRenderer.invoke('lists:rename', id, name),
  /** @param {number} id */
  deleteList:         (id)              => ipcRenderer.invoke('lists:delete', id),
  /** @param {number} listId @param {number} titleId */
  removeTitleFromList: (listId, titleId) => ipcRenderer.invoke('lists:removeTitle', listId, titleId),
  /** @param {number} titleId — Returns ids of lists that contain the title */
  getListIdsForTitle: (titleId)         => ipcRenderer.invoke('lists:getForTitle', titleId),

  // ── Statistics ───────────────────────────────────────────────────────────
  /** Returns [{ genre, n }] — top 10 genres across all titles */
  getGenreCounts:   () => ipcRenderer.invoke('stats:getGenreCounts'),
  /** Returns [{ month, n }] — completed titles per month for the last 12 months */
  getMonthlyWatched: () => ipcRenderer.invoke('stats:getMonthlyWatched'),
  /** Returns { totalHours } — total watch time for completed titles */
  getTotalHours:    () => ipcRenderer.invoke('stats:getTotalHours'),
  /** Returns { totals, completionRate, averageRating, ratedCount, totalHours,
   *  genreDistribution, topGenres, topRatedGenres, monthlyActivity } */
  getStatsOverview: () => ipcRenderer.invoke('stats:getOverview'),

  // ── Recommendations ──────────────────────────────────────────────────────
  /** Returns { recommendations: Title[], reason: string } */
  getRecommendations: () => ipcRenderer.invoke('recommendations:get'),
  /** @param {{ refresh?: boolean }} [options] — Returns { recommendations, reason, source, provider, fallbackReason?, generatedAt? }.
   *  Each recommendation carries an `explanation` sentence. `refresh` skips the cached AI result. */
  getAIRecommendations: (options) => ipcRenderer.invoke('recommendations:getAI', options),

  // ── Descubrir ────────────────────────────────────────────────────────────
  /** Returns { styles: [{ id, kind, label, genres, count, avgRating, type, seedTitles }], modifiers: [{ id, label, available }], counts } */
  getDiscoverStyles:  ()                  => ipcRenderer.invoke('discover:getStyles'),
  /** @param {{ styleId: string, type: 'movie'|'series', modifiers?: string[] }} params @param {{ refresh?: boolean }} [options]
   *  Returns { style, type, modifiers, name, intro, items, source, provider, fallbackReason?, reason } */
  generateDiscoverList: (params, options) => ipcRenderer.invoke('discover:generate', params, options),
  /** @param {{ name: string, intro?: string, items: { tmdb_id, type, reason }[] }} payload — Returns { list, added } */
  saveDiscoverList:   (payload)           => ipcRenderer.invoke('discover:save', payload),
  /** @param {{ mood: string, runtime: 'any'|'90'|'120'|'episode', source: 'pending'|'new'|'both', platformsOnly?: boolean }} input
   *  Returns { message, picks: [{ kind, key, title?|item?, reason }], source, provider, fallbackReason?, moodGenres, reason } */
  pickTonight:        (input, options)    => ipcRenderer.invoke('discover:tonight', input, options),
  /** @param {string} query — a loose description. Returns { results: [item + { clue, confidence }], source, provider, fallbackReason?, reason } */
  findByDescription:  (query)             => ipcRenderer.invoke('discover:describe', query),
  /** "No me interesa" @param {{ tmdb_id: number, type: string, title: string }} item */
  dismissTitle:       (item)              => ipcRenderer.invoke('discover:dismiss', item),
  undismissTitle:     (tmdbId, type)      => ipcRenderer.invoke('discover:undismiss', tmdbId, type),
  getDismissedTitles: ()                  => ipcRenderer.invoke('discover:getDismissed'),

  // ── TMDB (proxied through the main process; the key never reaches the renderer) ──
  /** @param {string} query — Returns up to 8 normalized movie/series results */
  tmdbSearch:      (query)        => ipcRenderer.invoke('tmdb:search', query),
  /** @param {number} tmdbId @param {'movie'|'series'} type — Returns full details */
  tmdbGetDetails:  (tmdbId, type) => ipcRenderer.invoke('tmdb:getDetails', tmdbId, type),
  /** @param {number} [limit] — Returns titles trending this week */
  tmdbGetTrending: (limit)        => ipcRenderer.invoke('tmdb:getTrending', limit),
  /** @param {number} tmdbId @param {'movie'|'series'} type — Returns { key, name, language, type } or null */
  tmdbGetTrailer:  (tmdbId, type) => ipcRenderer.invoke('tmdb:getTrailer', tmdbId, type),
  /** @param {number} tmdbId @param {'movie'|'series'} type — Returns { collection, seasons, nextEpisode, similar, upcoming } */
  tmdbGetRelated:  (tmdbId, type) => ipcRenderer.invoke('tmdb:getRelated', tmdbId, type),
  /** @param {number} tmdbId @param {'movie'|'series'} type @param {string} title — Returns { region, link, groups: { flatrate, free, rent, buy } } */
  tmdbGetWatchProviders: (tmdbId, type, title) => ipcRenderer.invoke('tmdb:getWatchProviders', tmdbId, type, title),
  /** Opens a where-to-watch link (TMDB or a known streaming service) in the browser */
  openWatchLink:   (url)          => ipcRenderer.invoke('app:openWatchLink', url),
  /** @param {string} videoId — Opens the YouTube video in the default browser */
  openYouTube:     (videoId)      => ipcRenderer.invoke('app:openYouTube', videoId),

  // ── App settings ─────────────────────────────────────────────────────────
  getTheme: ()        => ipcRenderer.invoke('app:getTheme'),
  setTheme: (theme)   => ipcRenderer.invoke('app:setTheme', theme),

  // ── API keys (values go in, never come back out) ─────────────────────────
  /** Returns { canSave, keys: { tmdb: { source }, gemini: { source } } }; source is 'app' | 'file' | 'process' | null */
  getApiKeys:   ()            => ipcRenderer.invoke('settings:getApiKeys'),
  /** @param {'tmdb'|'gemini'} name @param {string} value */
  setApiKey:    (name, value) => ipcRenderer.invoke('settings:setApiKey', name, value),
  clearApiKey:  (name)        => ipcRenderer.invoke('settings:clearApiKey', name),
  /** Checks the key in use against its service; returns { ok } or { error } */
  testApiKey:   (name)        => ipcRenderer.invoke('settings:testApiKey', name),
  /** Opens the page where that key is created, in the browser */
  openKeyPage:  (name)        => ipcRenderer.invoke('app:openKeyPage', name),

  // ── Auth ─────────────────────────────────────────────────────────────────
  /** `remember` keeps the session on this computer across restarts */
  register:       (name, email, password, remember) => ipcRenderer.invoke('auth:register', name, email, password, remember),
  login:          (email, password, remember)       => ipcRenderer.invoke('auth:login', email, password, remember),
  logout:         ()                      => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: ()                      => ipcRenderer.invoke('auth:getCurrentUser'),
  /** @param {{ name?: string, avatarUrl?: string|null }} data */
  updateProfile:  (data)                  => ipcRenderer.invoke('auth:updateProfile', data),
  changePassword: (currentPassword, newPassword) => ipcRenderer.invoke('auth:changePassword', currentPassword, newPassword),
  /** Permanently deletes the account and all its data; requires the password */
  deleteAccount:  (password)              => ipcRenderer.invoke('auth:deleteAccount', password),
});
