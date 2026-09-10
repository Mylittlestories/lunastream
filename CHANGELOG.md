# Changelog

All notable changes to LunaStream will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-10

### 🎉 Initial Release

#### Added
- **Multi-Source Streaming**
  - VidSrc (Primary embed source)
  - VidSrc PRO (HD/4K quality)
  - 2Embed (Backup source)
  - SuperEmbed (Multiple providers)
  - AutoSelect (Smart failover system)
  - The Pirate Bay torrents via apibay.org

- **Custom Video Player**
  - HTML5 video player with HLS.js support
  - Keyboard shortcuts (Space, J/K/L, F, M, arrows)
  - Playback speed control (0.5x - 2x)
  - Picture-in-Picture support
  - Custom controls overlay

- **Subtitle Support**
  - OpenSubtitles API integration
  - Subdl backup source
  - Multi-language support
  - Auto-fallback between sources
  - SRT to VTT conversion

- **Content Discovery**
  - TMDB integration for movies & series
  - Advanced filters (genre, year, rating, type)
  - Real-time search across all content
  - Categories: Trending, Popular, Top Rated, Upcoming
  - Cinemeta/Stremio catalog integration

- **User Features**
  - JWT-based authentication (register/login)
  - Personal watchlist
  - Watch history tracking
  - User settings & preferences
  - Analytics dashboard

- **Social Features**
  - Share to Twitter, Facebook, Reddit
  - Email sharing
  - Copy link functionality

- **Platform Support**
  - Web deployment (Vercel, Netlify, Cloudflare)
  - Desktop apps (Windows, macOS, Linux via Electron)
  - PWA support (installable on mobile)
  - Docker container support
  - Self-hosted (PM2, Nginx)

- **Developer Experience**
  - TypeScript throughout
  - Next.js 14 with App Router
  - Prisma ORM with SQLite
  - Tailwind CSS styling
  - GitHub Actions CI/CD
  - Automated releases

#### Security
- JWT authentication with bcryptjs
- Prisma parameterized queries
- Environment variable management
- HTTPS-ready configuration

#### Performance
- Next.js standalone output for minimal bundle
- Optimized images with unoptimized mode for compatibility
- First Load JS < 100KB
- Server-side API routes
- Efficient client-side caching
