const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
let serverReady = false;

function isDev() {
  return !app.isPackaged;
}

// Server is always inside the asar, so __dirname works for both dev and packaged
function getServerPath() {
  return path.join(__dirname, '..', '.next', 'standalone', 'server.js');
}

// Database needs a writable location (asar is read-only in packaged apps)
function getDatabasePath() {
  if (isDev()) {
    return path.join(__dirname, '..', 'prisma', 'dev.db');
  }
  // In packaged app, use user data directory (writable)
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'prisma');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'dev.db');
}

function getPublicPath() {
  if (isDev()) {
    return path.join(__dirname, '..', 'public');
  }
  // In packaged app, public/ is in extraResources
  return path.join(process.resourcesPath, 'public');
}

// Safe logging that won't crash with EPIPE
function safeLog(msg) {
  try { console.log(msg); } catch (e) {}
}
function safeWarn(msg) {
  try { console.warn(msg); } catch (e) {}
}
function safeError(msg) {
  try { console.error(msg); } catch (e) {}
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = getServerPath();
    const dbPath = getDatabasePath();

    safeLog('LunaStream: Server path: ' + serverPath);
    safeLog('LunaStream: Database path: ' + dbPath);

    // Check if server.js exists
    if (!fs.existsSync(serverPath)) {
      safeError('LunaStream: server.js not found at: ' + serverPath);
      // Try alternative paths for different packaging scenarios
      const alternatives = [
        path.join(process.resourcesPath, '.next', 'standalone', 'server.js'),
        path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js'),
        path.join(__dirname, 'server.js'),
      ];
      let found = false;
      for (const alt of alternatives) {
        if (fs.existsSync(alt)) {
          safeLog('LunaStream: Found server at alternative path: ' + alt);
          // Use this path instead
          return startServerWithPath(alt, dbPath, resolve, reject);
        }
      }
      safeError('LunaStream: Could not find server.js in any location');
      safeError('LunaStream: Tried: ' + [serverPath, ...alternatives].join(', '));
      reject(new Error('server.js not found'));
      return;
    }

    startServerWithPath(serverPath, dbPath, resolve, reject);
  });
}

function startServerWithPath(serverPath, dbPath, resolve, reject) {
  const publicPath = getPublicPath();

  try {
    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
        DATABASE_URL: `file:${dbPath}`,
        PUBLIC_DIR: publicPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
  } catch (e) {
    safeError('LunaStream: Failed to spawn server: ' + e.message);
    reject(e);
    return;
  }

  let resolved = false;

  const handleOutput = (data) => {
    const output = data.toString();
    safeLog('Server: ' + output.trim());
    if ((output.includes('Ready') || output.includes('started') || output.includes('listening')) && !resolved) {
      resolved = true;
      serverReady = true;
      resolve();
    }
  };

  serverProcess.stdout.on('data', handleOutput);
  serverProcess.stderr.on('data', (data) => {
    safeWarn('Server stderr: ' + data.toString().trim());
  });

  serverProcess.on('error', (error) => {
    safeError('LunaStream: Server process error: ' + error.message);
    if (!resolved) {
      resolved = true;
      reject(error);
    }
  });

  serverProcess.on('exit', (code) => {
    safeLog('LunaStream: Server exited with code ' + code);
  });

  // Timeout: assume ready after 20 seconds
  setTimeout(() => {
    if (!resolved) {
      resolved = true;
      serverReady = true;
      resolve();
    }
  }, 20000);
}

async function createWindow() {
  // Start the server first in production
  if (!isDev()) {
    try {
      await startServer();
    } catch (error) {
      safeError('LunaStream: Server start failed: ' + error.message);
      // Show error to user
      if (mainWindow) {
        dialog.showErrorBox('LunaStream - Server Error',
          'The internal server could not start.\n\n' + error.message +
          '\n\nPlease try reinstalling the application.');
      }
    }
  }

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
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('http://localhost:3000');
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

app.whenReady().then(createWindow).catch((err) => {
  safeError('LunaStream: App failed to start: ' + err.message);
  dialog.showErrorBox('LunaStream - Fatal Error', err.message);
  app.quit();
});

app.on('window-all-closed', () => {
  killServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  killServer();
});

function killServer() {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');
    } catch (e) {}
    serverProcess = null;
  }
}
