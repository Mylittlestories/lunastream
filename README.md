<div align="center">

# 🌙 LunaStream

### A Powerful Streaming Application for Everyone

[![Build Status](https://img.shields.io/github/actions/workflow/status/Mylittlestories/lunastream/build.yml?style=for-the-badge&logo=github&label=BUILD)](https://github.com/Mylittlestories/lunastream/actions)
[![License](https://img.shields.io/github/license/Mylittlestories/lunastream?style=for-the-badge&color=blue)](LICENSE)
[![Version](https://img.shields.io/github/v/release/Mylittlestories/lunastream?style=for-the-badge&color=purple)](https://github.com/Mylittlestories/lunastream/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Web%20%7C%20Android%20%7C%20iOS-green?style=for-the-badge)](#installation)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

[🚀 Quick Start](#-quick-start) • [📦 Installation](#-installation) • [📖 Documentation](#-documentation) • [🤝 Contributing](#-contributing) • [📜 License](#-license)

---

</div>

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎬 Multi-Source Streaming
- **5 Embed Sources** with smart auto-priority
  - VidSrc (Primary)
  - VidSrc PRO (HD/4K)
  - 2Embed (Backup)
  - SuperEmbed
  - AutoSelect (Smart Failover)
- **Torrent Support** via The Pirate Bay
- **WebTorrent** P2P streaming
- Auto-quality detection (4K, 1080p, 720p, 480p)

</td>
<td width="50%">

### 🎮 Custom Video Player
- **HTML5 Player** with HLS.js support
- **Keyboard Shortcuts** (Space, J/K/L, F, M)
- **Playback Speed** (0.5x - 2x)
- **Picture-in-Picture** support
- **Custom Controls** overlay
- Fullscreen mode

</td>
</tr>
<tr>
<td width="50%">

### 💬 Subtitle System
- **OpenSubtitles** API integration
- **Subdl** backup source
- Multi-language support
- SRT to VTT conversion
- Auto-fallback between sources
- Easy subtitle selection

</td>
<td width="50%">

### 🎯 Content Discovery
- **TMDB** integration for metadata
- **Advanced Filters** (genre, year, rating)
- Real-time search
- Categories: Trending, Popular, Top Rated
- **Cinemeta/Stremio** catalog support
- Personalized recommendations

</td>
</tr>
<tr>
<td width="50%">

### 👤 User Features
- JWT-based authentication
- Personal watchlist
- Watch history tracking
- Customizable settings
- Analytics dashboard
- Social sharing (Twitter, Facebook, Reddit)

</td>
<td width="50%">

### 📱 Cross-Platform
- **Web:** Vercel, Netlify, Cloudflare
- **Desktop:** Windows, macOS, Linux
- **Mobile:** Android, iOS (PWA)
- **Docker:** Self-hosted
- **No dependencies** needed for end users
- Works out-of-the-box

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Web (2 minutes)
```bash
# Deploy to Vercel
npx vercel
```

### Desktop (5 minutes)
```bash
# Download from releases
# Windows: LunaStream-Setup-1.0.0.exe
# macOS: LunaStream-1.0.0-x64.dmg
# Linux: LunaStream-1.0.0-x64.AppImage
```

### Docker (3 minutes)
```bash
docker run -d -p 3000:3000 -e JWT_SECRET=your-secret ghcr.io/Mylittlestories/lunastream:latest
```

### Development
```bash
git clone https://github.com/Mylittlestories/lunastream.git
cd lunastream
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

---

## 📦 Installation

### Desktop Applications

| Platform | Download | Format | Size |
|----------|----------|--------|------|
| **Windows** | [LunaStream-Setup.exe](https://github.com/Mylittlestories/lunastream/releases/latest) | NSIS Installer | ~150MB |
| **macOS** | [LunaStream.dmg](https://github.com/Mylittlestories/lunastream/releases/latest) | Disk Image | ~160MB |
| **Linux** | [LunaStream.AppImage](https://github.com/Mylittlestories/lunastream/releases/latest) | AppImage | ~140MB |
| **Linux (Debian)** | [lunastream.deb](https://github.com/Mylittlestories/lunastream/releases/latest) | Debian Package | ~130MB |

### Web Platforms

#### Vercel (Recommended)
```bash
npx vercel
```

#### Netlify
```bash
npx netlify deploy --prod
```

#### Self-Hosted
```bash
npm install
npm run build
npm start
```

### Docker
```bash
# Using Docker
docker build -t lunastream .
docker run -d -p 3000:3000 -e JWT_SECRET=your-secret lunastream

# Using Docker Compose
docker-compose up -d
```

### Mobile

#### Android
1. Download the APK from [releases](https://github.com/Mylittlestories/lunastream/releases)
2. Enable "Install from unknown sources" in settings
3. Install the APK

#### iOS
1. Add to Home Screen from Safari
2. Or build from source using Capacitor

---

## 🎮 Usage

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `J` | Rewind 10s |
| `K` | Play/Pause |
| `L` | Forward 10s |
| `F` | Fullscreen |
| `M` | Mute |
| `←` | Rewind 5s |
| `→` | Forward 5s |
| `↑` | Volume Up |
| `↓` | Volume Down |

### Stream Sources

LunaStream automatically selects the best stream source:

1. **VidSrc** - Primary source (fast & reliable)
2. **VidSrc PRO** - HD/4K quality
3. **2Embed** - Backup source
4. **SuperEmbed** - Multiple providers
5. **AutoSelect** - Smart failover system
6. **The Pirate Bay** - Torrent streaming

---

## 🛠️ Configuration

### Environment Variables

Create a `.env` file:

```env
# Required
JWT_SECRET=your-super-secret-key-here
DATABASE_URL=file:./prisma/dev.db

# Optional
TMDB_API_KEY=your-tmdb-api-key
OPENSUBTITLES_API_KEY=your-opensubtitles-key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Getting API Keys

- **TMDB API:** https://www.themoviedb.org/settings/api
- **OpenSubtitles:** https://www.opensubtitles.com/en/consumers

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [📦 Installation Guide](INSTALLATION.md) | Step-by-step installation for all platforms |
| [🚀 Deployment Guide](DEPLOYMENT.md) | Deploy to Vercel, Docker, VPS, Desktop |
| [✨ Features Summary](FEATURES_SUMMARY.md) | Complete feature list |
| [🔄 Recent Improvements](IMPROVEMENTS.md) | What's new in the latest version |
| [📋 Changelog](CHANGELOG.md) | Version history |
| [🤝 Contributing](CONTRIBUTING.md) | How to contribute |
| [🔒 Security Policy](SECURITY.md) | Report vulnerabilities |
| [📜 Code of Conduct](CODE_OF_CONDUCT.md) | Community guidelines |

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Prisma** | Database ORM |
| **SQLite** | Embedded database |
| **Electron** | Desktop applications |
| **HLS.js** | Video streaming |
| **Lucide React** | Icon library |
| **JWT** | Authentication |
| **GitHub Actions** | CI/CD automation |

---

## 📊 Project Structure

```
lunastream/
├── src/
│   ├── app/
│   │   ├── api/              # API routes (auth, streams, tmdb)
│   │   ├── analytics/        # Analytics dashboard
│   │   ├── history/          # Watch history
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration
│   │   ├── settings/         # User settings
│   │   ├── watchlist/        # Favorites
│   │   └── page.tsx          # Main app (36KB)
│   ├── components/
│   │   ├── AdvancedFilters.tsx
│   │   ├── ShareButton.tsx
│   │   ├── UserMenu.tsx
│   │   └── VideoPlayer.tsx
│   └── lib/
│       ├── auth.ts           # JWT authentication
│       ├── prisma.ts         # Database client
│       ├── stream-resolver.ts
│       └── subtitle-service.ts
├── electron/
│   └── main.js               # Desktop app entry
├── prisma/
│   └── schema.prisma         # Database schema
├── public/
│   ├── icon-192.png          # PWA icon
│   ├── icon-512.png          # App icon
│   └── manifest.json         # PWA manifest
├── .github/
│   └── workflows/
│       └── build.yml         # CI/CD pipeline
└── Dockerfile                # Container config
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Adding Stream Sources

To add a new stream source:

1. Test the source manually
2. Add to `resolveEmbedStreams()` in `src/app/page.tsx`
3. Include fallback handling
4. Document in README.md
5. Test with movies and series

---

## 📈 Roadmap

- [ ] Chromecast support
- [ ] Trakt.tv integration
- [ ] Real-Debrid integration
- [ ] Multi-language UI
- [ ] Offline downloads
- [ ] Advanced subtitle editor
- [ ] Torrent health indicators
- [ ] Custom addon support
- [ ] Browser extension
- [ ] Watch party feature

---

## 🐛 Troubleshooting

### Common Issues

<details>
<summary><b>Port 3000 already in use</b></summary>

```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```
</details>

<details>
<summary><b>Database connection errors</b></summary>

```bash
# Reset database
npx prisma db push --force-reset
```
</details>

<details>
<summary><b>Module not found errors</b></summary>

```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```
</details>

<details>
<summary><b>Electron app won't start</b></summary>

```bash
# Check logs
npm run electron-dev

# Rebuild
npm run build
```
</details>

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Stremio](https://www.stremio.com/) - Inspiration for the streaming interface
- [The Movie Database (TMDB)](https://www.themoviedb.org/) - Movie & TV metadata
- [OpenSubtitles](https://www.opensubtitles.com/) - Subtitle service
- [Next.js](https://nextjs.org/) - React framework
- [Electron](https://electronjs.org/) - Desktop framework
- All the amazing open-source contributors

---

## 📞 Support

- 💬 **Discussions:** [GitHub Discussions](https://github.com/Mylittlestories/lunastream/discussions)
- 🐛 **Issues:** [GitHub Issues](https://github.com/Mylittlestories/lunastream/issues)
- 💬 **Discord:** Join our community
- 📧 **Email:** Open an issue on GitHub

---

<div align="center">

**Made with ❤️ by the LunaStream Community**

[⭐ Star this repo](https://github.com/Mylittlestories/lunastream) • [🐛 Report Bug](https://github.com/Mylittlestories/lunastream/issues/new?template=bug_report.md) • [💡 Request Feature](https://github.com/Mylittlestories/lunastream/issues/new?template=feature_request.md)

</div>
