const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let win = null;

async function createWindow() {
  // Keep writes (uploads / output) out of the read-only app package.
  process.env.QCP_DATA_DIR = path.join(app.getPath('userData'), 'data');
  const { start } = require('../server');

  let port;
  try {
    port = await start(5173);
  } catch (err) {
    if (err.code === 'EADDRINUSE') port = await start(0);
    else throw err;
  }

  win = new BrowserWindow({
    width: 940,
    height: 780,
    minWidth: 640,
    minHeight: 520,
    backgroundColor: '#010102',
    autoHideMenuBar: true,
    title: 'Quick Convert Pro',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  win.loadURL(`http://localhost:${port}`);
  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
