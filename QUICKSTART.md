# 🚀 LunaStream - Quick Start Guide

## ⚡ Fastest Way to Deploy (2 minutes)

### Web Deployment (Vercel)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel
```

That's it! Your app is live at `https://your-app.vercel.app`

---

## 💻 Desktop App (10 minutes)

### Windows
```bash
npm install
npm run dist:win
# Install: dist/LunaStream Setup 1.0.0.exe
```

### macOS
```bash
npm install
npm run dist:mac
# Install: dist/LunaStream-1.0.0.dmg
```

### Linux
```bash
npm install
npm run dist:linux
# Install: dist/LunaStream-1.0.0.AppImage
```

---

## 🐳 Docker (5 minutes)

```bash
docker build -t lunastream .
docker run -p 3000:3000 lunastream
# Open: http://localhost:3000
```

---

## 🛠️ Development Mode

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env

# 3. Initialize database
npx prisma db push

# 4. Start development server
npm run dev

# 5. Open browser
# http://localhost:3000
```

---

## 📱 Mobile App

### Android
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init LunaStream com.lunastream.app
npx cap add android
npm run build
npx cap sync
npx cap open android
# Build APK in Android Studio
```

### iOS
```bash
npm install @capacitor/ios
npx cap add ios
npm run build
npx cap sync
npx cap open ios
# Build in Xcode
```

---

## 🎬 Features

✅ **5 Stream Sources** - VidSrc, 2Embed, SuperEmbed, VidSrc PRO, AutoSelect  
✅ **Torrent Support** - The Pirate Bay with quality detection  
✅ **Subtitles** - OpenSubtitles with multi-language  
✅ **Custom Player** - Keyboard shortcuts & advanced controls  
✅ **Filters** - Genre, year, rating, search  
✅ **User Profiles** - Authentication, watchlist, history  
✅ **Cross-Platform** - Web, Desktop, Mobile  

---

## 📖 Documentation

- **README.md** - Complete overview
- **DEPLOYMENT.md** - Detailed deployment guide
- **INSTALLATION.md** - Step-by-step installation
- **FEATURES_SUMMARY.md** - Feature list
- **IMPROVEMENTS.md** - What's new

---

## 🔧 Environment Variables

Create `.env` file:

```env
JWT_SECRET=your-super-secret-key-here
DATABASE_URL=file:./prisma/dev.db
```

**Required:** `JWT_SECRET` (any random string)  
**Optional:** `TMDB_API_KEY`, `OPENSUBTITLES_API_KEY`

---

## 📦 Build Commands

```bash
npm run dev          # Development mode
npm run build        # Production build
npm start            # Start production server
npm run dist:win     # Build Windows app
npm run dist:mac     # Build macOS app
npm run dist:linux   # Build Linux app
```

---

## 🆘 Troubleshooting

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Database errors:**
```bash
npx prisma db push --force-reset
```

**Module not found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🎯 Quick Links

- **Development:** http://localhost:3000
- **Production:** https://your-app.vercel.app
- **GitHub:** https://github.com/yourusername/lunastream
- **Issues:** https://github.com/yourusername/lunastream/issues

---

**Ready to stream? 🚀**

```bash
npm install
npm run dev
```

Open http://localhost:3000 and enjoy!
