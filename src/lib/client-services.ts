// Client-side service layer for self-contained Android app
// Replaces all server API routes with localStorage + direct API calls

// TMDB API Configuration
const TMDB_API_KEY = '66379f753df03f6632d5f2e01d631d28';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// ===== AUTH SERVICE =====
export interface User {
  id: string;
  email: string;
  name: string;
}

export const authService = {
  async register(email: string, password: string, name: string): Promise<User | null> {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      
      if (users.find((u: any) => u.email === email)) {
        throw new Error('User already exists');
      }
      
      const user = {
        id: Date.now().toString(),
        email,
        password, // In production, hash this
        name,
        createdAt: new Date().toISOString()
      };
      
      users.push(user);
      localStorage.setItem('users', JSON.stringify(users));
      
      const currentUser = { id: user.id, email: user.email, name: user.name };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      localStorage.setItem('authToken', user.id);
      
      return currentUser;
    } catch (error) {
      console.error('Register error:', error);
      return null;
    }
  },

  async login(email: string, password: string): Promise<User | null> {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      const currentUser = { id: user.id, email: user.email, name: user.name };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      localStorage.setItem('authToken', user.id);
      
      return currentUser;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  },

  async getCurrentUser(): Promise<User | null> {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    return JSON.parse(userStr);
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }
};

// ===== TMDB SERVICE =====
export interface TMDBMovie {
  id: string;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  imdb_id?: string;
}

export const tmdbService = {
  async search(query: string, type: 'movie' | 'tv' = 'movie'): Promise<TMDBMovie[]> {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  },

  async getTrending(type: 'movie' | 'tv' = 'movie'): Promise<TMDBMovie[]> {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/${type}/week?api_key=${TMDB_API_KEY}`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('TMDB trending error:', error);
      return [];
    }
  },

  async getPopular(type: 'movie' | 'tv' = 'movie'): Promise<TMDBMovie[]> {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/${type}/popular?api_key=${TMDB_API_KEY}`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('TMDB popular error:', error);
      return [];
    }
  },

  async getTopRated(type: 'movie' | 'tv' = 'movie'): Promise<TMDBMovie[]> {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/${type}/top_rated?api_key=${TMDB_API_KEY}`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('TMDB top rated error:', error);
      return [];
    }
  },

  async getUpcoming(): Promise<TMDBMovie[]> {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('TMDB upcoming error:', error);
      return [];
    }
  },

  async getDetails(id: string, type: 'movie' | 'tv'): Promise<any> {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}`
      );
      return await response.json();
    } catch (error) {
      console.error('TMDB details error:', error);
      return null;
    }
  }
};

// ===== WATCHLIST SERVICE =====
export interface WatchlistItem {
  id: string;
  type: 'movie' | 'series';
  title: string;
  poster?: string;
  year?: string;
  rating?: number;
  imdbId?: string;
}

export const watchlistService = {
  async getAll(): Promise<WatchlistItem[]> {
    const userId = localStorage.getItem('authToken');
    if (!userId) return [];
    
    const key = `watchlist_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  async add(item: WatchlistItem): Promise<WatchlistItem[]> {
    const userId = localStorage.getItem('authToken');
    if (!userId) throw new Error('Not authenticated');
    
    const key = `watchlist_${userId}`;
    const items = await this.getAll();
    items.push(item);
    localStorage.setItem(key, JSON.stringify(items));
    return items;
  },

  async remove(itemId: string): Promise<WatchlistItem[]> {
    const userId = localStorage.getItem('authToken');
    if (!userId) throw new Error('Not authenticated');
    
    const key = `watchlist_${userId}`;
    const items = await this.getAll();
    const filtered = items.filter(item => item.id !== itemId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return filtered;
  },

  async isInWatchlist(itemId: string): Promise<boolean> {
    const items = await this.getAll();
    return items.some(item => item.id === itemId);
  }
};

// ===== HISTORY SERVICE =====
export interface HistoryItem {
  id: string;
  type: 'movie' | 'series';
  title: string;
  poster?: string;
  year?: string;
  rating?: number;
  imdbId?: string;
  watchedAt: string;
}

export const historyService = {
  async getAll(): Promise<HistoryItem[]> {
    const userId = localStorage.getItem('authToken');
    if (!userId) return [];
    
    const key = `history_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  async add(item: Omit<HistoryItem, 'watchedAt'>): Promise<HistoryItem[]> {
    const userId = localStorage.getItem('authToken');
    if (!userId) throw new Error('Not authenticated');
    
    const key = `history_${userId}`;
    const items = await this.getAll();
    
    const historyItem: HistoryItem = {
      ...item,
      watchedAt: new Date().toISOString()
    };
    
    items.unshift(historyItem);
    
    // Keep only last 100 items
    const limited = items.slice(0, 100);
    localStorage.setItem(key, JSON.stringify(limited));
    return limited;
  },

  async clear(): Promise<void> {
    const userId = localStorage.getItem('authToken');
    if (!userId) return;
    
    const key = `history_${userId}`;
    localStorage.removeItem(key);
  }
};

// ===== STREAMS SERVICE =====
export interface Stream {
  url?: string;
  externalUrl?: string;
  name?: string;
  description?: string;
  title?: string;
  addonName: string;
  addonId: string;
  quality?: string;
  size?: string;
  infoHash?: string;
  seeders?: number;
  isTorrent?: boolean;
  isEmbed?: boolean;
  priority?: number;
}

export const streamsService = {
  async getTorrents(query: string): Promise<Stream[]> {
    try {
      // Use apibay.org directly (CORS-enabled)
      const response = await fetch(
        `https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=207,201,202,204,205`
      );
      const torrents = await response.json();
      
      if (!Array.isArray(torrents)) return [];
      
      return torrents
        .filter((t: any) => t.seeders > 0)
        .map((t: any) => ({
          url: `magnet:?xt=urn:btih:${t.info_hash}&dn=${encodeURIComponent(t.name)}`,
          name: t.name,
          description: `${t.name} (${this.formatSize(t.size)})`,
          addonName: 'The Pirate Bay',
          addonId: 'tpb',
          quality: this.detectQuality(t.name),
          size: this.formatSize(t.size),
          infoHash: t.info_hash,
          seeders: parseInt(t.seeders),
          isTorrent: true,
          priority: this.getTorrentPriority(t.name)
        }))
        .sort((a: Stream, b: Stream) => (b.seeders || 0) - (a.seeders || 0))
        .slice(0, 20);
    } catch (error) {
      console.error('Streams error:', error);
      return [];
    }
  },

  async getEmbedStreams(imdbId: string, type: 'movie' | 'series', season?: number, episode?: number): Promise<Stream[]> {
    const streams: Stream[] = [];

    // VidSrc (Primary)
    if (type === 'movie') {
      streams.push({
        externalUrl: `https://vidsrc.to/embed/movie/${imdbId}`,
        addonName: 'VidSrc',
        addonId: 'vidsrc',
        description: '▶ VidSrc - Primary (Fast & Reliable)',
        isEmbed: true,
        priority: 1
      });
    } else {
      streams.push({
        externalUrl: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`,
        addonName: 'VidSrc',
        addonId: 'vidsrc',
        description: '▶ VidSrc - Primary (Fast & Reliable)',
        isEmbed: true,
        priority: 1
      });
    }

    // 2Embed (Backup)
    if (type === 'movie') {
      streams.push({
        externalUrl: `https://www.2embed.cc/embed/${imdbId}`,
        addonName: '2Embed',
        addonId: '2embed',
        description: '▶ 2Embed - Backup',
        isEmbed: true,
        priority: 2
      });
    } else {
      streams.push({
        externalUrl: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`,
        addonName: '2Embed',
        addonId: '2embed',
        description: '▶ 2Embed - Backup',
        isEmbed: true,
        priority: 2
      });
    }

    // SuperEmbed
    if (type === 'movie') {
      streams.push({
        externalUrl: `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`,
        addonName: 'SuperEmbed',
        addonId: 'superembed',
        description: '▶ SuperEmbed - Multiple Providers',
        isEmbed: true,
        priority: 3
      });
    } else {
      streams.push({
        externalUrl: `https://multiembed.mov/?video_id=${imdbId}&tmdb=1&s=${season}&e=${episode}`,
        addonName: 'SuperEmbed',
        addonId: 'superembed',
        description: '▶ SuperEmbed - Multiple Providers',
        isEmbed: true,
        priority: 3
      });
    }

    // VidSrc PRO (HD/4K)
    if (type === 'movie') {
      streams.push({
        externalUrl: `https://vidsrc.pro/embed/movie/${imdbId}`,
        addonName: 'VidSrc PRO',
        addonId: 'vidsrc-pro',
        description: '▶ VidSrc PRO - HD/4K Quality',
        isEmbed: true,
        priority: 4
      });
    } else {
      streams.push({
        externalUrl: `https://vidsrc.pro/embed/tv/${imdbId}/${season}/${episode}`,
        addonName: 'VidSrc PRO',
        addonId: 'vidsrc-pro',
        description: '▶ VidSrc PRO - HD/4K Quality',
        isEmbed: true,
        priority: 4
      });
    }

    // AutoSelect (Smart failover)
    streams.push({
      externalUrl: streams[0].externalUrl, // Use first source as fallback
      addonName: 'AutoSelect',
      addonId: 'autoselect',
      description: '▶ AutoSelect - Smart Failover (Best Quality)',
      isEmbed: true,
      priority: 5
    });

    return streams;
  },

  formatSize(bytes: string | number): string {
    const size = parseInt(bytes.toString());
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  },

  detectQuality(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('2160p') || lower.includes('4k') || lower.includes('uhd')) return '4K';
    if (lower.includes('1080p')) return '1080p';
    if (lower.includes('720p')) return '720p';
    if (lower.includes('480p')) return '480p';
    return 'Unknown';
  },

  getTorrentPriority(name: string): number {
    const quality = this.detectQuality(name);
    switch (quality) {
      case '4K': return 1;
      case '1080p': return 2;
      case '720p': return 3;
      case '480p': return 4;
      default: return 5;
    }
  }
};

// ===== SUBTITLE SERVICE =====
export interface Subtitle {
  id: string;
  language: string;
  url: string;
  format: string;
}

export const subtitleService = {
  async getSubtitles(imdbId: string, season?: number, episode?: number): Promise<Subtitle[]> {
    try {
      // Use OpenSubtitles REST API (requires API key)
      const headers = {
        'Api-Key': 'YOUR_OPENSUBTITLES_API_KEY',
        'Content-Type': 'application/json'
      };

      const response = await fetch(
        `https://api.opensubtitles.com/api/v1/subtitles?imdb_id=${imdbId}`,
        { headers }
      );
      
      const data = await response.json();
      
      if (!data.data) return [];
      
      return data.data.map((sub: any) => ({
        id: sub.attributes.release_id.toString(),
        language: sub.attributes.language,
        url: sub.attributes.files?.[0]?.file_url || '',
        format: sub.attributes.files?.[0]?.file_extension || 'srt'
      }));
    } catch (error) {
      console.error('Subtitle error:', error);
      return [];
    }
  }
};

// ===== STREMIO SERVICE =====
export const stremioService = {
  async getCatalog(type: 'movie' | 'series'): Promise<any[]> {
    try {
      // Use Stremio's public catalog directly
      const response = await fetch(
        `https://v3-cinemeta.strem.io/catalog/${type}/top.json`
      );
      const data = await response.json();
      return data.metas || [];
    } catch (error) {
      console.error('Stremio catalog error:', error);
      return [];
    }
  }
};
