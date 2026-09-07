const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

/**
 * Desktop shell for the CRA build. Loads build/index.html (file://) or, when
 * ELECTRON_START_URL is set, the local react-scripts server for development.
 */

function profilePath() {
    return path.join(app.getPath('userData'), 'player-profile.json');
}

function registerProfileIpc() {
    ipcMain.handle('profile:load', async () => {
        try {
            const text = await fs.readFile(profilePath(), 'utf8');
            return JSON.parse(text);
        } catch {
            return null;
        }
    });

    ipcMain.handle('profile:save', async (_event, profile) => {
        if (!profile || typeof profile !== 'object') {
            throw new Error('Invalid profile');
        }
        await fs.writeFile(profilePath(), JSON.stringify(profile, null, 2), 'utf8');
        return true;
    });
}

function resolveIndexHtml() {
    // Packaged: app.asar root. Dev: repo owcardgame/.
    return path.join(app.getAppPath(), 'build', 'index.html');
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        backgroundColor: '#0b0f14',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    const show = () => {
        if (!win.isDestroyed() && !win.isVisible()) win.show();
    };

    win.once('ready-to-show', show);
    // If the page never becomes ready (missing asar / bad path), still show
    // so the user isn't left with a silent invisible process.
    setTimeout(show, 4000);

    win.webContents.on('did-fail-load', (_event, code, desc, url) => {
        console.error('[electron] did-fail-load', { code, desc, url });
        show();
    });

    const startUrl = process.env.ELECTRON_START_URL;
    if (startUrl) {
        win.loadURL(startUrl);
    } else {
        const indexHtml = resolveIndexHtml();
        console.log('[electron] loading', indexHtml);
        win.loadFile(indexHtml).catch((err) => {
            console.error('[electron] loadFile failed', err);
            show();
        });
    }

    if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
        win.webContents.openDevTools({ mode: 'detach' });
    }
}

app.whenReady().then(() => {
    registerProfileIpc();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
