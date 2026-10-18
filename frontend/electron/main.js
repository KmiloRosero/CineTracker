const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const { initDatabase } = require('../../backend/db/database.js');
const { registerIpcHandlers } = require('../../backend/ipc/handlers.js');
const imageCache = require('../../backend/services/imageCacheService.js');

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

let mainWindow;

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
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(() => {
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
