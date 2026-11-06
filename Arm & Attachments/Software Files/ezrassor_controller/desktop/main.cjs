'use strict';
const path = require('node:path');
const { app, BrowserWindow, ipcMain, session } = require('electron');
const { startStaticServer } = require('./static-server.cjs');
const { requestRover } = require('./rover-request.cjs');

let staticServer;
let appOrigin;
const appLock = app.requestSingleInstanceLock();
if (!appLock) {
  app.quit();
}

async function openController() {
  const exportDir = path.join(__dirname, 'web-build');
  const webServer = await startStaticServer(exportDir);
  staticServer = webServer.server;
  appOrigin = webServer.origin;
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 700,
    minHeight: 480,
    title: 'RE-RASSOR Controller',
    backgroundColor: '#2e3030',
    icon: path.join(__dirname, 'assets', 'color-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${appOrigin}/`)) {
      event.preventDefault();
    }
  });
  await mainWindow.loadURL(`${appOrigin}/`);
  if (process.env.RE_RASSOR_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.on('second-instance', () => {
  const existing = BrowserWindow.getAllWindows()[0];
  if (existing) {
    if (existing.isMinimized()) {
      existing.restore();
    }
    existing.focus();
  }
});

if (appLock) {
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    ipcMain.handle('rover:request', async (event, details) => {
      // IPC is valid only for the original app's embedded window
      const sender = event.sender;
      if (sender.isDestroyed() || event.senderFrame !== sender.mainFrame || !sender.getURL().startsWith(`${appOrigin}/`)) {
        throw new Error('Unauthorized IPC request.');
      }
      return requestRover(details);
    });
    return openController();
  }).catch((error) => {
    console.error('Unable to start RE-RASSOR Controller:', error);
    app.quit();
  });
}
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
});
