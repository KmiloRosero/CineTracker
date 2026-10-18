const { app, BrowserWindow, ipcMain, protocol, session } = require('electron');
const path = require('path');

// In development the backend lives beside frontend/; electron-builder copies it
// into the app as <app>/backend (see electron-builder.json "files").
const BACKEND = app.isPackaged ? path.join(__dirname, '../backend') : path.join(__dirname, '../../backend');
const { initDatabase } = require(path.join(BACKEND, 'db/database.js'));
const { registerIpcHandlers } = require(path.join(BACKEND, 'ipc/handlers.js'));
const imageCache = require(path.join(BACKEND, 'services/imageCacheService.js'));

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

// The renderer may only ever show the app itself: no navigation elsewhere,
// no new windows, no permission prompts (camera, location, notifications...).
function lockDown(contents) {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

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
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
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
