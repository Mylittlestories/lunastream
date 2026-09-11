/**
 * LunaStream preload - exposes a minimal, safe torrent API to the renderer.
 * Works with sandbox: true (sandboxed preloads may require a subset of
 * 'electron', including ipcRenderer and contextBridge).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lunaTorrent', {
  // Resolves { url, name, size, infoHash } or { error: message }
  play: (magnet) => ipcRenderer.invoke('luna-torrent:play', String(magnet || '')),
  stop: () => ipcRenderer.invoke('luna-torrent:stop'),
  // Subscribe to download progress: onProgress(cb) returns unsubscribe()
  onProgress: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('luna-torrent:progress', handler);
    return () => ipcRenderer.removeListener('luna-torrent:progress', handler);
  },
});
