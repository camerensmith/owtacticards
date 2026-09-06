const { app, BrowserWindow } = require('electron');
const path = require('path');

/**
 * Desktop shell for the CRA build. Loads build/index.html (file://) or, when
 * ELECTRON_START_URL is set, the local react-scripts server for development.
 */
function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        backgroundColor: '#0b0f14',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    win.once('ready-to-show', () => win.show());

    const startUrl = process.env.ELECTRON_START_URL;
    if (startUrl) {
        win.loadURL(startUrl);
    } else {
        win.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
    }

    if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
        win.webContents.openDevTools({ mode: 'detach' });
    }
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
