# 🚀 LunaStream Deployment Guide

Complete guide for deploying LunaStream to various platforms.

## 📋 Table of Contents

1. [Quick Deployment Options](#quick-deployment-options)
2. [Web Deployment](#web-deployment)
3. [Desktop Applications](#desktop-applications)
4. [Mobile Applications](#mobile-applications)
5. [Self-Hosted Deployment](#self-hosted-deployment)
6. [GitHub Actions CI/CD](#github-actions-cicd)

---

## ⚡ Quick Deployment Options

### Option 1: Vercel (Recommended for Web)
**Time:** 2 minutes  
**Cost:** Free  
**Best for:** Web deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: Desktop App (Electron)
**Time:** 10 minutes  
**Cost:** Free  
**Best for:** Windows/macOS/Linux desktop

```bash
# Build for your platform
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### Option 3: Docker
**Time:** 5 minutes  
**Cost:** Free  
**Best for:** Self-hosted servers

```bash
docker build -t lunastream .
docker run -p 3000:3000 lunastream
```

---

## 🌐 Web Deployment

### Vercel (Recommended)

**One-Click Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/lunastream)

**Manual Deploy:**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? Choose your account
# - Link to existing project? N
# - Project name? lunastream
# - Directory? ./
# - Override settings? N

# 4. Deploy to production
vercel --prod
```

**Environment Variables:**

Set these in Vercel dashboard → Project Settings → Environment Variables:

```
JWT_SECRET=your-secret-key-here
DATABASE_URL=file:./prisma/dev.db
```

### Netlify

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Build the project
npm run build

# 3. Deploy
netlify deploy --prod --dir=.next
```

### Cloudflare Pages

```bash
# 1. Connect your GitHub repo to Cloudflare Pages
# 2. Set build command: npm run build
# 3. Set output directory: .next
# 4. Deploy
```

---

## 💻 Desktop Applications

### Prerequisites

```bash
# Install dependencies
npm install
```

### Build for Windows

```bash
# Build Windows installer
npm run dist:win

# Output: dist/LunaStream Setup 1.0.0.exe
```

**Installation:**
1. Double-click `LunaStream Setup 1.0.0.exe`
2. Follow the installation wizard
3. Launch from Start Menu or Desktop shortcut

### Build for macOS

```bash
# Build macOS DMG
npm run dist:mac

# Output: dist/LunaStream-1.0.0.dmg
```

**Installation:**
1. Double-click `LunaStream-1.0.0.dmg`
2. Drag LunaStream to Applications folder
3. Launch from Applications

### Build for Linux

```bash
# Build Linux packages
npm run dist:linux

# Output: 
# - dist/LunaStream-1.0.0.AppImage
# - dist/lunastream_1.0.0_amd64.deb
```

**Installation (AppImage):**
```bash
# Make executable
chmod +x dist/LunaStream-1.0.0.AppImage

# Run
./dist/LunaStream-1.0.0.AppImage
```

**Installation (Debian/Ubuntu):**
```bash
sudo dpkg -i dist/lunastream_1.0.0_amd64.deb
```

---

## 📱 Mobile Applications

### Android

**Prerequisites:**
- Android Studio
- Java JDK 11+

**Steps:**

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor
npx cap init LunaStream com.lunastream.app

# 3. Add Android platform
npx cap add android

# 4. Build the web app
npm run build

# 5. Sync web assets
npx cap sync

# 6. Open in Android Studio
npx cap open android
```

**In Android Studio:**
1. Wait for Gradle sync
2. Click Build → Build Bundle(s) / APK(s) → Build APK
3. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**Install on Device:**
```bash
# Enable USB debugging on phone
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS

**Prerequisites:**
- Mac with Xcode
- Apple Developer Account ($99/year)

**Steps:**

```bash
# 1. Install Capacitor iOS
npm install @capacitor/ios

# 2. Add iOS platform
npx cap add ios

# 3. Build the web app
npm run build

# 4. Sync web assets
npx cap sync

# 5. Open in Xcode
npx cap open ios
```

**In Xcode:**
1. Select your development team
2. Set Bundle Identifier: `com.lunastream.app`
3. Click Play button to run on simulator or device

**Publish to App Store:**
1. Product → Archive
2. Distribute App → App Store Connect
3. Submit for review

---

## 🏠 Self-Hosted Deployment

### Docker Deployment

**1. Create Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production
RUN npx prisma generate

# Copy built app
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start the app
CMD ["node", "server.js"]
```

**2. Build and run:**

```bash
# Build the image
docker build -t lunastream .

# Run the container
docker run -d \
  --name lunastream \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -v lunastream-data:/app/prisma \
  lunastream
```

**3. Access the app:**
Open http://localhost:3000

### PM2 Deployment (Recommended for VPS)

**1. Install PM2:**

```bash
npm install -g pm2
```

**2. Build the app:**

```bash
npm run build
```

**3. Start with PM2:**

```bash
# Start the app
pm2 start npm --name "lunastream" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**4. Manage the app:**

```bash
# Check status
pm2 status

# View logs
pm2 logs lunastream

# Restart
pm2 restart lunastream

# Stop
pm2 stop lunastream
```

### Nginx Reverse Proxy

**1. Install Nginx:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

**2. Configure Nginx:**

```nginx
# /etc/nginx/sites-available/lunastream

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**3. Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/lunastream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**4. Setup SSL with Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔄 GitHub Actions CI/CD

The repository includes automated CI/CD workflows in `.github/workflows/`:

### Build Workflow (`.github/workflows/build.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main`
- Tag pushes (v*)

**Jobs:**
1. Build on Ubuntu, Windows, and macOS
2. Run tests
3. Create release (on tag push)

**Setup:**

1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Add the following secrets:

```
JWT_SECRET=your-production-secret
DATABASE_URL=file:./prisma/dev.db
```

4. Create a release:

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# - Build for all platforms
# - Create a release
# - Upload binaries
```

### Manual Release

```bash
# 1. Update version in package.json
npm version 1.0.0

# 2. Create and push tag
git tag v1.0.0
git push origin v1.0.0

# 3. GitHub Actions will create the release automatically
```

---

## 🔧 Environment Variables

### Required

```env
JWT_SECRET=your-super-secret-key-change-this
DATABASE_URL=file:./prisma/dev.db
```

### Optional

```env
# OpenSubtitles API (for better subtitles)
OPENSUBTITLES_API_KEY=your-key-here

# TMDB API (for enhanced metadata)
TMDB_API_KEY=your-key-here

# Application URL (for sharing features)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 📊 Deployment Comparison

| Platform | Cost | Setup Time | Maintenance | Best For |
|----------|------|------------|-------------|----------|
| Vercel | Free | 2 min | Low | Web deployment |
| Netlify | Free | 5 min | Low | Web deployment |
| Docker | Free | 10 min | Medium | Self-hosted |
| PM2 | Free | 15 min | Medium | VPS deployment |
| Electron | Free | 30 min | Low | Desktop apps |
| Mobile | $99/yr | 1 hr | High | Mobile apps |

---

## 🐛 Troubleshooting

### Build Errors

**Error:** `Module not found`
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error:** `Database connection failed`
```bash
# Reset database
npx prisma db push --force-reset
```

### Runtime Errors

**Error:** `Port 3000 already in use`
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

**Error:** `JWT_SECRET not set`
```bash
# Set environment variable
export JWT_SECRET=your-secret-key
```

### Electron Errors

**Error:** `Cannot find module 'server.js'`
```bash
# Rebuild
npm run build
```

**Error:** `App won't start`
```bash
# Check logs
npm run electron-dev
```

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/lunastream/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/lunastream/discussions)
- **Email:** support@lunastream.app

---

## ✅ Deployment Checklist

- [ ] Set JWT_SECRET environment variable
- [ ] Configure DATABASE_URL
- [ ] Test the deployment
- [ ] Setup SSL (for web)
- [ ] Configure CORS (if needed)
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Test on multiple devices/browsers

---

**Your LunaStream app is ready to deploy! 🚀**
