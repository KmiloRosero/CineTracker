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

  // ── Lists ────────────────────────────────────────────────────────────────
  /** @param {string} name */
  createList:     (name)              => ipcRenderer.invoke('lists:create', name),
  /** @param {number} listId @param {number} titleId */
  addTitleToList: (listId, titleId)   => ipcRenderer.invoke('lists:addTitle', listId, titleId),
  /** Returns lists with their titles eagerly loaded */
  getAllLists:     ()                  => ipcRenderer.invoke('lists:getAll'),

  // ── Statistics ───────────────────────────────────────────────────────────
  /** Returns [{ genre, n }] — top 10 genres across all titles */
  getGenreCounts:   () => ipcRenderer.invoke('stats:getGenreCounts'),
  /** Returns [{ month, n }] — completed titles per month for the last 12 months */
  getMonthlyWatched: () => ipcRenderer.invoke('stats:getMonthlyWatched'),
  /** Returns { totalHours } — total watch time for completed titles */
  getTotalHours:    () => ipcRenderer.invoke('stats:getTotalHours'),

  // ── Recommendations ──────────────────────────────────────────────────────
  /** Returns { recommendations: Title[], reason: string } */
  getRecommendations: () => ipcRenderer.invoke('recommendations:get'),

  // ── App settings ─────────────────────────────────────────────────────────
  getTheme: ()        => ipcRenderer.invoke('app:getTheme'),
  setTheme: (theme)   => ipcRenderer.invoke('app:setTheme', theme),

  // ── Auth ─────────────────────────────────────────────────────────────────
  register:       (name, email, password) => ipcRenderer.invoke('auth:register', name, email, password),
  login:          (email, password)       => ipcRenderer.invoke('auth:login', email, password),
  logout:         ()                      => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: ()                      => ipcRenderer.invoke('auth:getCurrentUser'),
});
