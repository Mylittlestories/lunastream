const { app, BrowserWindow, Menu, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

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
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.map': 'application/json',
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
    path.join(__dirname, '..', 'out'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // fallback
}

function registerProtocol() {
  const assetsPath = getAssetsPath();

  protocol.handle('lunastream', async (request) => {
    let urlPath = request.url.replace('lunastream://', '');
    // Remove leading slash
    if (urlPath.startsWith('/')) urlPath = urlPath.substring(1);
    // Default to index.html
    if (!urlPath || urlPath === '') urlPath = 'index.html';

    const filePath = path.join(assetsPath, urlPath);

    // Security: prevent path traversal
    if (!filePath.startsWith(assetsPath)) {
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

  if (isDev()) {
    // In dev mode, serve static files via the custom protocol
    mainWindow.loadURL('lunastream://app/index.html');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, serve static files via the custom protocol
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

app.whenReady().then(() => {
  registerProtocol();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
