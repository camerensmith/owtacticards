const { contextBridge, ipcRenderer } = require('electron');

/**
 * Safe bridge for the renderer: load/save player profile JSON in userData.
 * Keep this surface tiny — no general fs access.
 */
contextBridge.exposeInMainWorld('owProfile', {
    load: () => ipcRenderer.invoke('profile:load'),
    save: (profile) => ipcRenderer.invoke('profile:save', profile),
});
