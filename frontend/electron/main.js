const { app, BrowserWindow, ipcMain, protocol, session, shell, safeStorage } = require('electron');
const path = require('path');

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

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
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
