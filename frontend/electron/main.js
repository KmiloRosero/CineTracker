const { app, BrowserWindow, ipcMain, protocol, session, shell, safeStorage, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

// In development the backend lives beside frontend/; electron-builder copies it
// into the app as <app>/backend (see electron-builder.json "files").
const BACKEND = app.isPackaged ? path.join(__dirname, '../backend') : path.join(__dirname, '../../backend');
const { initDatabase } = require(path.join(BACKEND, 'db/database.js'));
const { registerIpcHandlers } = require(path.join(BACKEND, 'ipc/handlers.js'));
const imageCache = require(path.join(BACKEND, 'services/imageCacheService.js'));
const { configureSecrets } = require(path.join(BACKEND, 'utils/secrets.js'));

// Posters and backdrops load through ctimg://<size>/<file> so they are cached
// on disk and keep working offline. Must be registered before app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: 'ctimg', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function registerImageProtocol() {
  const cacheDir = path.join(app.getPath('userData'), 'image-cache');
  protocol.handle('ctimg', async (request) => {
    const ref = imageCache.parseImageUrl(request.url);
    if (!ref) return new Response('Bad image reference', { status: 400 });
    try {
      const { buffer, contentType } = await imageCache.getImage(ref, { cacheDir });
      return new Response(buffer, {
        headers: {
          'content-type': contentType,
          // lets the renderer sample poster colours on a canvas
          'access-control-allow-origin': '*',
          'cache-control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return new Response('Image unavailable', { status: 404 });
    }
  });
}

const isDev = process.env.NODE_ENV === 'development';

// Smoke test (CI on Windows, macOS and Linux): CINETRACKER_SMOKE=1 starts the
// app with a throwaway profile, opens the database, loads the interface and
// exits 0 when it rendered without errors, 1 otherwise.
const SMOKE = process.env.CINETRACKER_SMOKE === '1';
if (SMOKE) {
  app.setPath('userData', path.join(require('os').tmpdir(), `cinetracker-smoke-${process.pid}`));
}

function runSmokeTest(win) {
  const errors = [];
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 3) errors.push(message); });
  win.webContents.on('render-process-gone', (_e, d) => errors.push(`renderer gone: ${d.reason}`));
  const fail = (why) => { console.error(`[smoke] FAIL: ${why}`); app.exit(1); };
  setTimeout(() => fail('timed out after 60 s'), 60000).unref();
  win.webContents.once('did-finish-load', async () => {
    for (let i = 0; i < 40; i++) {
      const rendered = await win.webContents
        .executeJavaScript("Boolean(document.querySelector('.app-layout') && window.electronAPI)")
        .catch(() => false);
      if (rendered) {
        if (errors.length) return fail(errors.join(' | '));
        console.log('[smoke] OK: database opened and interface rendered');
        return app.exit(0);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return fail(`interface did not render${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  });
}
const DEV_URL = 'http://localhost:5173';

let mainWindow;

// Trailers play in YouTube's privacy-enhanced embed; it is the only page
// allowed inside a frame (see the frame-src CSP in index.html).
const YOUTUBE_EMBED = 'https://www.youtube-nocookie.com/';
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
// YouTube rejects embeds whose request carries no Referer (error 153), and a
// page loaded from file:// sends none. As YouTube asks of desktop and WebView
// apps, the player request identifies the app instead.
const APP_REFERRER = 'https://com.cinetracker.app/';

function isYouTubeLink(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && /^(www\.|m\.)?(youtube\.com|youtu\.be)$/.test(hostname);
  } catch {
    return false;
  }
}

// The renderer may only ever show the app itself: no navigation elsewhere,
// no new windows, no permission prompts (camera, location, notifications...).
// Links out of the trailer player open in the user's browser.
function lockDown(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (isYouTubeLink(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });
  contents.on('will-frame-navigate', (details) => {
    if (details.isMainFrame) return;
    if (!details.url.startsWith(YOUTUBE_EMBED) && details.url !== 'about:blank') details.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

function configureSession(ses) {
  // Fullscreen is the one permission granted, and only to the trailer player.
  ses.setPermissionRequestHandler((_contents, permission, callback, details) => {
    const origin = details?.requestingUrl ?? '';
    callback(permission === 'fullscreen' && origin.startsWith(YOUTUBE_EMBED));
  });
  ses.webRequest.onBeforeSendHeaders({ urls: [`${YOUTUBE_EMBED}*`] }, (details, callback) => {
    const headers = { ...details.requestHeaders };
    if (!headers.Referer && !headers.referer) headers.Referer = APP_REFERRER;
    callback({ requestHeaders: headers });
  });
}

// Opens a trailer on youtube.com in the browser (fallback when the embed is blocked).
ipcMain.handle('app:openYouTube', (_event, videoId) => {
  if (typeof videoId !== 'string' || !YOUTUBE_ID.test(videoId)) return { error: 'Video no válido.' };
  shell.openExternal(`https://www.youtube.com/watch?v=${videoId}`);
  return { ok: true };
});

// Where-to-watch links: TMDB's watch page or a known streaming service, https only.
const WATCH_HOSTS = new Set([
  'www.themoviedb.org', 'www.netflix.com', 'www.disneyplus.com', 'www.primevideo.com',
  'tv.apple.com', 'play.google.com', 'www.youtube.com',
]);
ipcMain.handle('app:openWatchLink', (_event, url) => {
  let parsed;
  try { parsed = new URL(url); } catch { return { error: 'Enlace no válido.' }; }
  if (parsed.protocol !== 'https:' || !WATCH_HOSTS.has(parsed.hostname)) return { error: 'Enlace no válido.' };
  shell.openExternal(parsed.toString());
  return { ok: true };
});

// Pages where each API key is created (Perfil > Claves de API).
const KEY_PAGES = {
  tmdb:   'https://www.themoviedb.org/settings/api',
  gemini: 'https://aistudio.google.com/apikey',
};
ipcMain.handle('app:openKeyPage', (_event, name) => {
  if (!Object.prototype.hasOwnProperty.call(KEY_PAGES, name)) return { error: 'Página no válida.' };
  shell.openExternal(KEY_PAGES[name]);
  return { ok: true };
});

// Import and export (Perfil > Tus datos): the user picks the file in a
// native dialog; the renderer never gets a path, only the text.
const CSV_FILTERS = [{ name: 'CSV', extensions: ['csv'] }];
const MAX_TEXT_BYTES = 20 * 1024 * 1024;

ipcMain.handle('app:saveTextFile', async (_event, fileName, content) => {
  if (typeof content !== 'string' || content.length > 50 * 1024 * 1024) return { error: 'No hay nada que guardar.' };
  const safeName = String(fileName ?? 'cinetracker.csv').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar exportación',
    defaultPath: path.join(app.getPath('documents'), safeName.endsWith('.csv') ? safeName : `${safeName}.csv`),
    filters: CSV_FILTERS,
  });
  if (canceled || !filePath) return { canceled: true };
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return { ok: true, name: path.basename(filePath) };
  } catch {
    return { error: 'No se pudo guardar el archivo. Elige otra carpeta.' };
  }
});

ipcMain.handle('app:openTextFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Elegir archivo para importar',
    properties: ['openFile'],
    filters: CSV_FILTERS,
  });
  if (canceled || !filePaths?.[0]) return { canceled: true };
  try {
    const { size } = await fs.stat(filePaths[0]);
    if (size > MAX_TEXT_BYTES) return { error: 'El archivo es demasiado grande (máximo 20 MB).' };
    return { name: path.basename(filePaths[0]), content: await fs.readFile(filePaths[0], 'utf8') };
  } catch {
    return { error: 'No se pudo leer el archivo.' };
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: isDev,
    },
    show: false,
  });

  lockDown(mainWindow.webContents);
  if (SMOKE) runSmokeTest(mainWindow);

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => { if (!SMOKE) mainWindow.show(); });
}

app.whenReady().then(() => {
  configureSession(session.defaultSession);
  // API keys typed in the app and the "keep me signed in" token are sealed
  // with the OS (DPAPI on Windows); without it they are simply not saved.
  if (safeStorage.isEncryptionAvailable()) {
    configureSecrets({
      encrypt: (text) => safeStorage.encryptString(text),
      decrypt: (buffer) => safeStorage.decryptString(buffer),
    });
  }
  initDatabase();
  registerImageProtocol();
  registerIpcHandlers(ipcMain);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
