const { app, BrowserWindow, Menu, dialog, protocol, net, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { TorrentEngine } = require('./torrent-engine.js');

let mainWindow;
let torrentEngine = null;

function getTorrentEngine() {
  if (!torrentEngine) {
    torrentEngine = new TorrentEngine({
      downloadPath: path.join(app.getPath('userData'), 'torrents'),
      onProgress: (p) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('luna-torrent:progress', p);
        }
      },
    });
  }
  return torrentEngine;
}

ipcMain.handle('luna-torrent:play', async (_event, magnet) => {
  try {
    return await getTorrentEngine().play(magnet);
  } catch (err) {
    return { error: err && err.message ? err.message : 'Torrent engine failed' };
  }
});
ipcMain.handle('luna-torrent:stop', async () => {
  if (torrentEngine) torrentEngine.stop();
  return true;
});

function isDev() {
  return !app.isPackaged;
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

function getMime(ext) {
  return MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}

function getAssetsPath() {
  if (isDev()) {
    // In dev, serve from the out/ directory
    return path.join(__dirname, '..', 'out');
  }
  // In packaged app, static files are in resources/app.asar/out or resources/out
  const candidates = [
    path.join(process.resourcesPath, 'app.asar.unpacked', 'out'),
    path.join(process.resourcesPath, 'out'),
    path.join(process.resourcesPath, 'app.asar', 'out'),
    path.join(__dirname, '..', 'out'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // fallback
}

// IMPORTANT: must be called before app is ready.
// Registers the custom scheme as standard/secure so that:
//  - absolute paths like /_next/... resolve correctly against the origin
//  - fetch()/XHR and CORS work from the app origin
//  - streaming (Range requests) works for video elements
function registerSchemePrivileges() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'lunastream',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

function registerProtocol() {
  const assetsPath = getAssetsPath();

  protocol.handle('lunastream', async (request) => {
    // request.url looks like lunastream://app/index.html
    // Use the URL parser: the HOST ("app") must NOT be part of the file path.
    // The old implementation used string replace, which produced paths like
    // out/app/_next/... that never existed and fell back to index.html for
    // every JS/CSS file -> the app could never load.
    let urlPath;
    try {
      const u = new URL(request.url);
      urlPath = decodeURIComponent(u.pathname);
    } catch {
      urlPath = '/index.html';
    }
    if (urlPath.startsWith('/')) urlPath = urlPath.substring(1);
    // Directory-style URLs from the static export (trailingSlash: true)
    // e.g. lunastream://app/login/ -> login/index.html
    if (urlPath === '' || urlPath.endsWith('/')) {
      urlPath += 'index.html';
    }

    const filePath = path.normalize(path.join(assetsPath, urlPath));

    // Security: prevent path traversal
    if (!filePath.startsWith(path.normalize(assetsPath))) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      return new Response(content, {
        headers: { 'Content-Type': getMime(ext) },
      });
    } catch (e) {
      // File not found - serve index.html for SPA navigation
      try {
        const indexPath = path.join(assetsPath, 'index.html');
        const content = fs.readFileSync(indexPath);
        return new Response(content, {
          headers: { 'Content-Type': 'text/html' },
        });
      } catch (e2) {
        return new Response('Not Found', { status: 404 });
      }
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '..', 'public', 'icon-512.png'),
    title: 'LunaStream',
    backgroundColor: '#0b0b1a',
    show: false,
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links (http/https) in the system browser instead of a
  // blank Electron window. Keeps the app single-window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // If the page navigates to an external URL, open it externally and stay here
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('lunastream://')) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  // Production: serve the static export via the custom protocol.
  // Dev: use the static export if it exists, otherwise the `next dev` server
  // (started by `npm run electron-dev`).
  if (isDev() && !fs.existsSync(path.join(__dirname, '..', 'out', 'index.html'))) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL('lunastream://app/index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: () => mainWindow && mainWindow.webContents.reload() },
        { type: 'separator' },
        { label: 'Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow && mainWindow.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { role: 'resetzoom' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About LunaStream',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About LunaStream',
              message: 'LunaStream',
              detail: `Version ${app.getVersion()}\n\nA powerful streaming application.\n\nBuilt with Next.js & Electron.\nhttps://github.com/Mylittlestories/lunastream`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Must register scheme privileges BEFORE app ready
registerSchemePrivileges();

app.whenReady().then(() => {
  registerProtocol();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', (event) => {
  if (torrentEngine) {
    event.preventDefault();
    torrentEngine.destroy().finally(() => app.exit(0));
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
