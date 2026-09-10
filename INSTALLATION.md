# 🚀 LunaStream Installation Guide

Complete step-by-step installation instructions for all platforms.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Web Deployment](#web-deployment)
4. [Desktop Applications](#desktop-applications)
5. [Mobile Applications](#mobile-applications)
6. [Self-Hosted Deployment](#self-hosted-deployment)
7. [Configuration](#configuration)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software

**Node.js & npm:**
- Download from: https://nodejs.org/
- Recommended version: Node.js 18.x or higher
- Verify installation:
  ```bash
  node --version  # Should show v18.x.x or higher
  npm --version   # Should show 9.x.x or higher
  ```

**Git (Optional but recommended):**
- Download from: https://git-scm.com/
- Verify installation:
  ```bash
  git --version
  ```

**Database:**
- SQLite (included, no installation needed)
- Database file will be created automatically at `prisma/dev.db`

---

## 💻 Development Setup

### Step 1: Get the Source Code

**Option A: Download ZIP**
```bash
# Download from your file manager
# Extract to: C:\Users\YourName\lunastream (Windows)
# Extract to: ~/lunastream (Mac/Linux)
```

**Option B: Clone from Git**
```bash
git clone https://github.com/yourusername/lunastream.git
cd lunastream
```

### Step 2: Install Dependencies

Open a terminal/command prompt in the project folder:

**Windows (Command Prompt):**
```cmd
cd C:\Users\YourName\lunastream
npm install
```

**Windows (PowerShell):**
```powershell
cd C:\Users\YourName\lunastream
npm install
```

**Mac/Linux:**
```bash
cd ~/lunastream
npm install
```

This will install all required packages. Wait for the process to complete (2-5 minutes).

### Step 3: Set Up Database

Initialize the SQLite database:

```bash
npx prisma db push
```

This creates the database file at `prisma/dev.db`.

### Step 4: Create Environment File

Create a file named `.env` in the project root:

**Windows (Notepad):**
```cmd
notepad .env
```

**Mac/Linux:**
```bash
nano .env
```

Add the following content:
```env
# Authentication
JWT_SECRET=your-super-secret-key-change-this-in-production

# Database
DATABASE_URL="file:./dev.db"

# Application
NODE_ENV=development
```

Save and close the file.

### Step 5: Start Development Server

```bash
npm run dev
```

You should see:
```
✓ Ready in 1.5s
○ Local:   http://localhost:3000
```

### Step 6: Open in Browser

Navigate to: **http://localhost:3000**

**To stop the server:** Press `Ctrl+C` in the terminal.

---

## 🌐 Web Deployment

### Option 1: Vercel (Recommended - Free)

**Step 1: Create Vercel Account**
1. Go to https://vercel.com/
2. Sign up with GitHub
3. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

**Step 2: Deploy**
```bash
# Login to Vercel
vercel login

# Deploy the project
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Choose your account
# - Link to existing project? No
# - Project name? lunastream
# - Directory? ./ (press Enter)
# - Override settings? No

# Deploy to production
vercel --prod
```

**Step 3: Access Your Site**
- You'll get a URL like: `https://lunastream.vercel.app`
- Your app is now live!

### Option 2: Netlify (Free)

**Step 1: Build the Project**
```bash
npm run build
```

**Step 2: Deploy**

**Option A: Netlify CLI**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=.next
```

**Option B: Drag and Drop**
1. Go to https://app.netlify.com/
2. Drag the `.next` folder to the deploy area
3. Your site is live!

### Option 3: Railway (Free Tier)

**Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

**Step 2: Deploy**
```bash
railway login
railway init
railway up
```

---

## 🖥️ Desktop Applications

### Windows Desktop App (Electron)

**Step 1: Install Electron Builder**
```bash
npm install --save-dev electron electron-builder
```

**Step 2: Create Electron Main File**

Create `electron/main.js`:
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../public/icon-512.png')
  });

  if (dev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  await nextApp.prepare();
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
```

**Step 3: Update package.json**

Add to `package.json`:
```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron-build": "npm run build && electron-builder",
    "electron-start": "electron ."
  },
  "build": {
    "appId": "com.lunastream.app",
    "productName": "LunaStream",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "nsis",
      "icon": "public/icon-512.png"
    },
    "mac": {
      "target": "dmg",
      "icon": "public/icon-512.png"
    },
    "linux": {
      "target": "AppImage",
      "icon": "public/icon-512.png"
    }
  }
}
```

**Step 4: Install Additional Dependencies**
```bash
npm install --save-dev concurrently wait-on
```

**Step 5: Build Windows Installer**
```bash
npm run electron-build
```

The installer will be in the `dist` folder:
- `LunaStream Setup 1.0.0.exe`

**Step 6: Install on Windows**
1. Double-click the `.exe` file
2. Follow the installation wizard
3. Launch LunaStream from Start Menu

### Mac Desktop App

**Step 1: Build for Mac**
```bash
npm run electron-build
```

**Step 2: Install**
1. Open `dist/LunaStream-1.0.0.dmg`
2. Drag LunaStream to Applications folder
3. Launch from Applications

### Linux Desktop App

**Step 1: Build for Linux**
```bash
npm run electron-build
```

**Step 2: Install**
```bash
# Make executable
chmod +x dist/LunaStream-1.0.0.AppImage

# Run
./dist/LunaStream-1.0.0.AppImage

# Optional: Create desktop shortcut
cat > ~/.local/share/applications/lunastream.desktop << EOF
[Desktop Entry]
Name=LunaStream
Exec=$PWD/dist/LunaStream-1.0.0.AppImage
Icon=$PWD/public/icon-512.png
Type=Application
Categories=Video;AudioVideo;
EOF
```

---

## 📱 Mobile Applications

### Android App (Capacitor)

**Step 1: Install Capacitor**
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

**Step 2: Initialize Capacitor**
```bash
npx cap init

# Answer prompts:
# App name: LunaStream
# App package ID: com.lunastream.app
# Web directory: .next
```

**Step 3: Build the Web App**
```bash
npm run build
```

**Step 4: Add Android Platform**
```bash
npx cap add android
```

**Step 5: Sync Web Assets**
```bash
npx cap sync
```

**Step 6: Open in Android Studio**
```bash
npx cap open android
```

**Step 7: Build APK in Android Studio**
1. Android Studio will open
2. Wait for Gradle sync to complete
3. Click `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
4. Wait for build to complete
5. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**Step 8: Install on Android**

**Option A: USB Debugging**
1. Enable Developer Options on Android:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB
4. Install APK:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

**Option B: Transfer APK**
1. Copy `app-debug.apk` to phone
2. Open file manager on phone
3. Tap the APK file
4. Allow installation from unknown sources
5. Install

### iOS App (Capacitor)

**Prerequisites:**
- Mac with Xcode installed
- Apple Developer Account ($99/year)

**Step 1: Add iOS Platform**
```bash
npx cap add ios
```

**Step 2: Sync Web Assets**
```bash
npx cap sync
```

**Step 3: Open in Xcode**
```bash
npx cap open ios
```

**Step 4: Configure Signing**
1. In Xcode, select your project
2. Go to "Signing & Capabilities" tab
3. Select your Apple Developer team
4. Set Bundle Identifier: `com.lunastream.app`

**Step 5: Build for Simulator**
1. Select iPhone simulator
2. Click Play button (▶)
3. App runs in simulator

**Step 6: Build for Device**
1. Connect iPhone via USB
2. Select your device in Xcode
3. Click Play button (▶)
4. Trust the developer on iPhone:
   - Settings → General → Device Management → Trust

**Step 7: Publish to App Store**
1. In Xcode: Product → Archive
2. Open Organizer window
3. Click "Distribute App"
4. Follow App Store Connect prompts
5. Submit for review

---

## 🏠 Self-Hosted Deployment

### Using Docker

**Step 1: Create Dockerfile**

Create `Dockerfile` in project root:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Step 2: Create docker-compose.yml**

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  lunastream:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
    volumes:
      - ./prisma:/app/prisma
    restart: unless-stopped
```

**Step 3: Build and Run**
```bash
# Build the image
docker-compose build

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access at: `http://your-server-ip:3000`

### Using PM2 (Process Manager)

**Step 1: Install PM2**
```bash
npm install -g pm2
```

**Step 2: Build the App**
```bash
npm run build
```

**Step 3: Start with PM2**
```bash
pm2 start npm --name "lunastream" -- start
```

**Step 4: Save PM2 Configuration**
```bash
pm2 save
pm2 startup
```

**Step 5: Manage**
```bash
pm2 status          # Check status
pm2 logs lunastream # View logs
pm2 restart lunastream  # Restart
pm2 stop lunastream     # Stop
```

### Using Nginx as Reverse Proxy

**Step 1: Install Nginx**

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx
```

**CentOS/RHEL:**
```bash
sudo yum install nginx
```

**Step 2: Configure Nginx**

Create `/etc/nginx/sites-available/lunastream`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Step 3: Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/lunastream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 4: SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file:
```env
# Authentication (CHANGE THIS!)
JWT_SECRET=your-super-secret-key-min-32-chars

# Database
DATABASE_URL="file:./dev.db"

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional: External APIs
TMDB_API_KEY=your-tmdb-api-key
OPENSUBTITLES_API_KEY=your-opensubtitles-key
```

### Database Management

**Reset Database:**
```bash
npx prisma db push --force-reset
```

**Backup Database:**
```bash
cp prisma/dev.db prisma/dev.db.backup
```

**Restore Database:**
```bash
cp prisma/dev.db.backup prisma/dev.db
```

---

## 🔍 Troubleshooting

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Database Errors

**Error:** `Database schema file not found`

**Solution:**
```bash
# Reinitialize database
npx prisma db push
```

### Build Errors

**Error:** `Module not found`

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### CORS Errors

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**
Update `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        ],
      },
    ];
  },
};
```

### Electron App Not Starting

**Error:** `Cannot find module 'electron'`

**Solution:**
```bash
npm install --save-dev electron
```

### Android Build Fails

**Error:** `Could not determine the dependencies`

**Solution:**
1. Open Android Studio
2. File → Invalidate Caches / Restart
3. Wait for reindex
4. Build → Rebuild Project

### iOS Build Fails

**Error:** `Signing for "LunaStream" requires a development team`

**Solution:**
1. Open in Xcode: `npx cap open ios`
2. Select project → Signing & Capabilities
3. Select your development team
4. Clean build: Product → Clean Build Folder

---

## 📞 Support

If you encounter issues:

1. Check the logs:
   ```bash
   npm run dev  # Development
   pm2 logs     # Production with PM2
   docker-compose logs  # Docker
   ```

2. Verify all dependencies are installed:
   ```bash
   npm install
   ```

3. Clear cache:
   ```bash
   rm -rf .next node_modules/.cache
   ```

4. Check Node.js version:
   ```bash
   node --version  # Should be 18.x or higher
   ```

---

## ✅ Quick Start Checklist

- [ ] Install Node.js 18+
- [ ] Clone/download project
- [ ] Run `npm install`
- [ ] Create `.env` file with JWT_SECRET
- [ ] Run `npx prisma db push`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Create an account
- [ ] Start watching!

---

**Your LunaStream app is now ready to use! 🎉**
