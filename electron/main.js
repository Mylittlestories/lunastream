const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function isDev() {
  return !app.isPackaged;
}

function getServerPath() {
  if (isDev()) {
    return path.join(__dirname, '../.next/standalone/server.js');
  }
  // In packaged app, resources are in process.resourcesPath
  return path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');
}

function getEnvPath() {
  if (isDev()) {
    return path.join(__dirname, '../');
  }
  return path.join(process.resourcesPath, 'app');
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = getServerPath();
    const envPath = getEnvPath();

    console.log('Starting server from:', serverPath);

    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
        DATABASE_URL: `file:${path.join(envPath, 'prisma', 'dev.db')}`,
      },
      stdio: 'pipe',
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Server: ${output}`);
      if (output.includes('Ready') || output.includes('started')) {
        if (!serverReady) {
          serverReady = true;
          resolve();
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      if (!serverReady) {
        reject(error);
      }
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!serverReady) {
        serverReady = true;
        resolve();
      }
    }, 15000);
  });
}

async function createWindow() {
  // Start the server first in production
  if (!isDev()) {
    try {
      await startServer();
    } catch (error) {
      console.error('Server start failed:', error);
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
    icon: path.join(__dirname, isDev() ? '../public/icon-512.png' : '../icon-512.png'),
    title: 'LunaStream',
    backgroundColor: '#0b0b1a',
    show: false,
    autoHideMenuBar: true,
  });

  // Show window when ready to prevent visual flash
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

  // Custom menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.webContents.reload(),
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
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
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About LunaStream',
              message: 'LunaStream',
              detail: `Version ${app.getVersion()}\n\nA powerful streaming application combining the best of Stremio and custom streaming.\n\nBuilt with Next.js & Electron.\nhttps://github.com/lunastream/lunastream`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
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
  if (serverProcess) {
    serverProcess.kill();
  }
});
