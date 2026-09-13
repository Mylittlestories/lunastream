'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Home, Film, Tv, Search, Settings, Play, Star, ChevronLeft, ChevronRight,
  Loader2, Plus, Trash2, ToggleLeft, ToggleRight, Bookmark, BookmarkCheck,
  ArrowLeft, Clock, TrendingUp, Flame, Calendar, Info, ExternalLink, AlertCircle,
  Subtitles, SkipForward, Upload, Maximize, Minimize
} from 'lucide-react';

// ===== TYPES =====
interface MediaItem {
  id: string;
  type: 'movie' | 'series';
  title: string;
  poster?: string;
  backdrop?: string;
  overview?: string;
  year?: string;
  rating?: number;
  imdbId?: string;
  genres?: string[];
  runtime?: string;
}

interface ResolvedStream {
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
  priority?: number; // Lower = higher priority
  episodeMatch?: 'exact' | 'pack' | 'unknown'; // series torrents: exact SxxEyy vs season pack vs untagged
}

interface AddonConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  types: string[];
}

// ===== CONSTANTS =====
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

// apibay.org (TPB) does not send CORS headers, so a direct browser fetch is
// blocked. Try direct first, then fall back to public CORS mirrors so torrent
// search keeps working without any local server.
const APIBAY_URL = 'https://apibay.org/q.php';
const CORS_FALLBACKS = (url: string) => [
  url,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchJSONWithCorsFallback(url: string, timeoutMs = 15000): Promise<any | null> {
  for (const candidate of CORS_FALLBACKS(url)) {
    try {
      const res = await fetch(candidate, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // try next candidate
    }
  }
  return null;
}

const DEFAULT_ADDONS: AddonConfig[] = [
  { id: 'torrentio', name: 'Torrentio', url: 'https://torrentio.strem.fun', enabled: true, types: ['movie', 'series'] },
  { id: 'torrentio-elfhosted', name: 'Torrentio (ElfHosted)', url: 'https://torrentio.elfhosted.com', enabled: true, types: ['movie', 'series'] },
  { id: 'comet', name: 'Comet', url: 'https://comet.elfhosted.com', enabled: true, types: ['movie', 'series'] },
  { id: 'mediafusion', name: 'MediaFusion', url: 'https://mediafusion.elfhosted.com', enabled: true, types: ['movie', 'series'] },
  { id: 'aiostreams', name: 'AIOStreams', url: 'https://aiostreams.elfhosted.com', enabled: true, types: ['movie', 'series'] },
];

// ===== BUILT-IN WORKING STREAMS =====
// Free / Creative Commons streams that actually work
const BUILTIN_STREAMS: Record<string, ResolvedStream[]> = {
  // Big Buck Bunny
  'tt1254207': [
    {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      name: 'LunaStream',
      description: '▶ Big Buck Bunny (2008) - 1080p - Creative Commons - Full Movie',
      addonName: 'Built-in',
      addonId: 'builtin',
      quality: '1080p',
      size: '300 MB',
    },
  ],
  // Sintel
  'tt1727583': [
    {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      name: 'LunaStream',
      description: '▶ Sintel (2010) - 1080p - Creative Commons - Full Movie',
      addonName: 'Built-in',
      addonId: 'builtin',
      quality: '1080p',
      size: '250 MB',
    },
  ],
  // Tears of Steel
  'tt2285452': [
    {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      name: 'LunaStream',
      description: '▶ Tears of Steel (2012) - 1080p - Creative Commons - Full Movie',
      addonName: 'Built-in',
      addonId: 'builtin',
      quality: '1080p',
      size: '400 MB',
    },
  ],
  // Elephants Dream
  'tt0807840': [
    {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      name: 'LunaStream',
      description: '▶ Elephants Dream (2006) - 1080p - Creative Commons - Full Movie',
      addonName: 'Built-in',
      addonId: 'builtin',
      quality: '1080p',
      size: '350 MB',
    },
  ],
  // For Bigger Blazes (Google demo)
  'tt_demo_1': [
    {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      name: 'LunaStream',
      description: '▶ For Bigger Blazes - Demo - 1080p',
      addonName: 'Built-in',
      addonId: 'builtin',
      quality: '1080p',
    },
  ],
};

// HLS test streams (these ALWAYS work)
const HLS_DEMO_STREAMS: Record<string, ResolvedStream[]> = {
  'tt_demo_hls': [
    {
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      name: 'LunaStream HLS',
      description: '▶ Apple Test Stream - HLS Adaptive - Continuous playback demo',
      addonName: 'Built-in',
      addonId: 'builtin',
      quality: '1080p',
    },
  ],
};

// ===== HELPER FUNCTIONS =====
// Self-contained: Direct API calls (no server proxy needed)
async function fetchViaProxy(path: string): Promise<any> {
  try {
    // Call external APIs directly (they support CORS)
    const res = await fetch(path, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Direct fetch error:', error);
    return null;
  }
}

async function fetchStreamsViaProxy(addonBase: string, type: string, id: string): Promise<ResolvedStream[]> {
  const url = `${addonBase}/stream/${type}/${id}.json`;
  try {
    // Call Stremio addons directly (they support CORS)
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.streams) return [];
    return data.streams
      .filter((s: any) => {
        // Stremio torrent streams carry infoHash (no url) - they MUST pass,
        // they play in our own player. Only drop config nags.
        if (!s.url && !s.externalUrl && !s.infoHash) return false;
        if (s.description?.includes('requires you to reconfigure')) return false;
        if (s.description?.includes('click this stream')) return false;
        if (s.externalUrl?.includes('/configure')) return false;
        if (s.externalUrl?.includes('/stremio/configure')) return false;
        return true;
      })
      .map((s: any) => {
        const isTorrent = !!s.infoHash;
        const rawLabel = String(s.name || '').split('\n')[0] || addonBase.split('/').pop() || 'Add-on';
        const info = s.description || s.title || '';
        // Torrentio/MediaFusion put seeders in the title: "\u{1F465} 152"
        const seedM = info.match(/\uD83D\uDC65\s*([\d.,]+)\s*([KM])?/i);
        const seeders = seedM
          ? Math.round(parseFloat(seedM[1].replace(/,/g, '')) * (seedM[2]?.toUpperCase() === 'K' ? 1000 : seedM[2]?.toUpperCase() === 'M' ? 1000000 : 1))
          : undefined;
        return {
          url: isTorrent
            ? `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(String(info).split('\n')[0] || 'stream')}`
            : s.url,
          externalUrl: s.externalUrl,
          infoHash: s.infoHash,
          isTorrent,
          seeders,
          name: s.name || rawLabel,
          description: info || rawLabel,
          title: info || rawLabel,
          addonName: rawLabel,
          addonId: addonBase,
          quality: extractQuality(info),
          size: extractSize(info),
        };
      });
  } catch (error) {
    console.error(`Error fetching streams from ${addonBase}:`, error);
    return [];
  }
}

function extractQuality(text: string): string {
  if (text.match(/2160|4K|UHDRip/i)) return '4K';
  if (text.match(/1080/i)) return '1080p';
  if (text.match(/720/i)) return '720p';
  if (text.match(/480/i)) return '480p';
  return '';
}

function extractSize(text: string): string {
  const m = text.match(/(\d+\.?\d*)\s*(GB|MB)/i);
  return m ? `${m[1]} ${m[2]}` : '';
}

async function resolveAllStreams(
  addons: AddonConfig[],
  type: 'movie' | 'series',
  imdbId: string,
  season?: number,
  episode?: number,
  seriesTitle?: string
): Promise<ResolvedStream[]> {
  let queryId = imdbId;
  if (type === 'series' && season !== undefined && episode !== undefined) {
    queryId = `${imdbId}:${season}:${episode}`;
  }

  // Check built-in streams first
  const builtin = BUILTIN_STREAMS[imdbId] || [];

  // Fetch from The Pirate Bay (automatic, no configuration needed)
  const tpbStreams = await fetchTPBStreams(imdbId, type, season, episode, seriesTitle);

  // Extra built-in torrent indexes (raise our-own-player hit rate):
  // YTS for movies, EZTV for exact episodes
  const [ytsStreams, eztvStreams] = await Promise.all([
    fetchYTSStreams(imdbId, type),
    fetchEZTVStreams(imdbId, type, season, episode, seriesTitle),
  ]);

  // Fetch from all enabled addons via proxy
  const results = await Promise.allSettled(
    addons
      .filter(a => a.enabled)
      .map(addon => fetchStreamsViaProxy(addon.url, type, queryId))
  );

  const allStreams: ResolvedStream[] = [...builtin, ...tpbStreams, ...ytsStreams, ...eztvStreams];
  for (const result of results) {
    if (result.status === 'fulfilled') allStreams.push(...result.value);
  }

  // Sort: OUR OWN PLAYER first (torrents + direct URLs - no third-party
  // player, no ads), then embeds (third-party iframe players) as fallback.
  const qualityOrder: Record<string, number> = { '4K': 0, '1080p': 1, '720p': 2, '480p': 3 };
  const tier = (s: ResolvedStream) => {
    if (s.isEmbed) return 2;                    // third-party iframe player (ads) - last resort
    if (s.isTorrent) return 0;                  // our own player, zero ads
    return 1;                                   // direct URL in our own player
  };
  // Dedupe magnets across providers by infoHash (TPB/YTS/EZTV overlap) -
  // keep the entry with the most seeders
  const seenHashes = new Map<string, ResolvedStream>();
  const deduped: ResolvedStream[] = [];
  for (const st of allStreams) {
    if (st.isTorrent && st.infoHash) {
      const ex = seenHashes.get(st.infoHash);
      if (!ex) { seenHashes.set(st.infoHash, st); deduped.push(st); }
      else if ((st.seeders || 0) > (ex.seeders || 0)) {
        deduped[deduped.indexOf(ex)] = st;
        seenHashes.set(st.infoHash, st);
      }
    } else {
      deduped.push(st);
    }
  }
  allStreams.length = 0;
  allStreams.push(...deduped);

  // Within a tier for series: exact episode > season pack > unknown
  const epRank = (s: ResolvedStream) => s.episodeMatch === 'exact' ? 0 : s.episodeMatch === 'pack' ? 1 : 2;
  allStreams.sort((a, b) => {
    const ta = tier(a), tb = tier(b);
    if (ta !== tb) return ta - tb;
    const ea = epRank(a), eb = epRank(b);
    if (ea !== eb) return ea - eb;
    // Then quality, then seeders
    const qa = qualityOrder[a.quality || ''] ?? 5;
    const qb = qualityOrder[b.quality || ''] ?? 5;
    if (qa !== qb) return qa - qb;
    return (b.seeders || 0) - (a.seeders || 0);
  });

  return allStreams;
}

async function fetchTPBStreams(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number,
  seriesTitle?: string
): Promise<ResolvedStream[]> {
  const streams: ResolvedStream[] = [];

  try {
    // Add direct streaming sources (these actually work in browser)
    const embedStreams = await getEmbedStreams(imdbId, type, season, episode);
    streams.push(...embedStreams);

    // Torrent streams from apibay.org (The Pirate Bay API).
    // EPISODE-AWARE: query by IMDb id first; if a specific episode was
    // requested and no exact SxxEyy upload came back, ALSO search by series
    // title + SxxEyy (some uploads are not linked to the IMDb id). Exact
    // episodes rank above season packs; packs are dropped when exact ones exist.
    try {
      const CATS = '207,201,202,204,205';
      const wantEpisode = type === 'series' && season !== undefined && episode !== undefined;
      const wantEpTag = wantEpisode
        ? `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`
        : '';

      const classify = (name: string): 'exact' | 'pack' | 'unknown' =>
        wantEpisode ? classifyEpisodeMatch(name, season as number, episode as number) : 'unknown';

      const toStreams = (rows: any[]): ResolvedStream[] => rows
        .filter((t: any) => parseInt(t.seeders) > 0)
        .map((t: any) => ({
          name: t.name,
          description: t.name,
          title: t.name,
          addonName: '🏴‍☠️ TPB',
          addonId: 'tpb',
          quality: extractQuality(t.name),
          size: formatBytes(t.size),
          infoHash: t.info_hash,
          seeders: parseInt(t.seeders) || 0,
          url: `magnet:?xt=urn:btih:${t.info_hash}&dn=${encodeURIComponent(t.name)}`,
          isTorrent: true,
          episodeMatch: wantEpisode ? classify(t.name) : undefined,
        }));

      // Query 1: IMDb id (best mapping quality)
      const imdbRows = await fetchJSONWithCorsFallback(`${APIBAY_URL}?q=${encodeURIComponent(imdbId)}&cat=${CATS}`);
      let torrentStreams: ResolvedStream[] = Array.isArray(imdbRows) ? toStreams(imdbRows) : [];
      const hasExact = () => torrentStreams.some(st => st.episodeMatch === 'exact');

      // Query 2: title + episode (fallback - catches uploads not tied to the
      // IMDb id, and improves movie recall when the id search is empty)
      const baseTitle = (seriesTitle || '').trim();
      if (baseTitle && (torrentStreams.length === 0 || (wantEpisode && !hasExact()))) {
        const titleQuery = wantEpisode ? `${baseTitle} ${wantEpTag}` : baseTitle;
        const titleRows = await fetchJSONWithCorsFallback(`${APIBAY_URL}?q=${encodeURIComponent(titleQuery)}&cat=${CATS}`);
        if (Array.isArray(titleRows)) {
          const seen = new Set(torrentStreams.map(st => st.infoHash).filter(Boolean));
          torrentStreams.push(...toStreams(titleRows).filter(st => st.infoHash && !seen.has(st.infoHash)));
        }
      }

      // Prefer exact episodes: drop season packs when exact ones exist
      if (wantEpisode && hasExact()) {
        torrentStreams = torrentStreams.filter(st => st.episodeMatch === 'exact');
      }

      const epSort = (a: ResolvedStream, b: ResolvedStream) =>
        ((a.episodeMatch === 'exact' ? 0 : a.episodeMatch === 'pack' ? 1 : 2) -
         (b.episodeMatch === 'exact' ? 0 : b.episodeMatch === 'pack' ? 1 : 2)) ||
        ((b.seeders || 0) - (a.seeders || 0));
      streams.push(...torrentStreams.sort(epSort).slice(0, 15));
    } catch (e) {
      console.error('TPB fetch error:', e);
    }
  } catch (error) {
    console.error('Stream fetch error:', error);
  }

  return streams;
}

// Classify a release name against a requested episode. Shared by TPB + EZTV.
function classifyEpisodeMatch(name: string, season: number, episode: number): 'exact' | 'pack' | 'unknown' {
  const lower = (name || '').toLowerCase();
  const m = lower.match(/\bs(\d{1,2})[\s._-]?[ex](\d{1,3})\b/)
         || lower.match(/(?:^|[\s._-])(\d{1,2})x(\d{1,3})(?:$|[\s._-])/);
  if (m) {
    return parseInt(m[1], 10) === season && parseInt(m[2], 10) === episode
      ? 'exact' : 'pack';
  }
  if (/(complete|season[\s._-]*\d|\bs\d{1,2}\b)/.test(lower)) return 'pack';
  return 'unknown';
}

// YTS (YIFY) - movie torrents, API is CORS-friendly and very reliable for films
async function fetchYTSStreams(imdbId: string, type: 'movie' | 'series'): Promise<ResolvedStream[]> {
  if (type !== 'movie' || !imdbId || !imdbId.startsWith('tt')) return [];
  const streams: ResolvedStream[] = [];
  try {
    const data = await fetchJSONWithCorsFallback(
      `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(imdbId)}`
    );
    const movies = data?.data?.movies;
    if (Array.isArray(movies) && movies.length > 0) {
      const movie = movies[0];
      for (const t of (movie.torrents || [])) {
        if (!t.hash || (t.seeds !== undefined && parseInt(t.seeds) <= 0)) continue;
        streams.push({
          name: `${movie.title_long} - ${t.quality}`,
          description: `${movie.title_long} (${t.quality}) - YTS`,
          title: `${movie.title_long} - ${t.quality}`,
          addonName: '🍿 YTS',
          addonId: 'yts',
          quality: t.quality,
          size: formatBytes(parseInt(t.size)),
          infoHash: t.hash,
          seeders: parseInt(t.seeds) || 0,
          url: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(movie.title_long + ' ' + t.quality)}`,
          isTorrent: true,
        });
      }
    }
  } catch (e) {
    console.error('YTS fetch error:', e);
  }
  return streams;
}

// EZTV - series torrents, queried directly by imdb id + season + episode
async function fetchEZTVStreams(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number,
  seriesTitle?: string
): Promise<ResolvedStream[]> {
  if (type !== 'series' || season === undefined || episode === undefined || !imdbId || !imdbId.startsWith('tt')) return [];
  const streams: ResolvedStream[] = [];
  try {
    const data = await fetchJSONWithCorsFallback(
      `https://eztv.re/api/get-torrents?imdb_id=${encodeURIComponent(imdbId)}&season=${season}&episode=${episode}`
    );
    const rows = data?.torrents;
    if (Array.isArray(rows)) {
      for (const t of rows) {
        if (!t.info_hash || parseInt(t.seeds) <= 0) continue;
        // EZTV's season/episode query params are unreliable (they sometimes
        // return unrelated SHOWS) - verify the release title ourselves:
        // 1) the SxxEyy tag must match, 2) the show name must match.
        if (classifyEpisodeMatch(t.title || '', season, episode) !== 'exact') continue;
        const titleWords = (seriesTitle || '')
          .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
          .filter(w => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w));
        const rel = (t.title || '').toLowerCase();
        if (titleWords.length > 0 && !titleWords.some(w => rel.includes(w))) continue;
        streams.push({
          name: t.title,
          description: t.title,
          title: t.title,
          addonName: '📺 EZTV',
          addonId: 'eztv',
          quality: extractQuality(t.title),
          size: formatBytes(parseInt(t.size_bytes)),
          infoHash: t.info_hash,
          seeders: parseInt(t.seeds) || 0,
          url: `magnet:?xt=urn:btih:${t.info_hash}&dn=${encodeURIComponent(t.title || 'episode')}`,
          isTorrent: true,
          episodeMatch: 'exact',
        });
      }
    }
  } catch (e) {
    console.error('EZTV fetch error:', e);
  }
  return streams;
}

// User preference: third-party embed fallback can be switched OFF entirely
// (Settings -> Sources). Default: on (last-resort for titles without torrents).
const EMBEDS_PREF_KEY = 'lunastream_embeds_enabled';

// Get streams from free video embed sources with auto-fallback
async function getEmbedStreams(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<ResolvedStream[]> {
  const streams: ResolvedStream[] = [];
  try {
    if (typeof window !== 'undefined' && localStorage.getItem(EMBEDS_PREF_KEY) === 'off') {
      return []; // user disabled third-party embeds entirely
    }
  } catch {}

  // Primary source: VidSrc
  let vidsrcUrl = '';
  if (type === 'movie') {
    vidsrcUrl = `https://vidsrc.to/embed/movie/${imdbId}`;
  } else if (season !== undefined && episode !== undefined) {
    vidsrcUrl = `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;
  }

  if (vidsrcUrl) {
    streams.push({
      name: 'VidSrc (Primary)',
      description: `Direct stream - ${type === 'movie' ? 'Movie' : `S${season}E${episode}`} - Fast & Reliable`,
      title: 'VidSrc Stream',
      addonName: '🎬 VidSrc',
      addonId: 'vidsrc',
      quality: '1080p',
      url: vidsrcUrl,
      isTorrent: false,
      isEmbed: true,
      priority: 1,
    });
  }

  // Secondary source: 2Embed (backup)
  let embed2Url = '';
  if (type === 'movie') {
    embed2Url = `https://www.2embed.cc/embed/${imdbId}`;
  } else if (season !== undefined && episode !== undefined) {
    embed2Url = `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`;
  }

  if (embed2Url) {
    streams.push({
      name: '2Embed (Backup)',
      description: `Alternative stream - ${type === 'movie' ? 'Movie' : `S${season}E${episode}`} - Use if primary fails`,
      title: '2Embed Stream',
      addonName: '📺 2Embed',
      addonId: '2embed',
      quality: '1080p',
      url: embed2Url,
      isTorrent: false,
      isEmbed: true,
      priority: 2,
    });
  }

  // Tertiary source: SuperEmbed
  let superEmbedUrl = '';
  if (type === 'movie') {
    superEmbedUrl = `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`;
  } else if (season !== undefined && episode !== undefined) {
    superEmbedUrl = `https://multiembed.mov/?video_id=${imdbId}&tmdb=1&s=${season}&e=${episode}`;
  }

  if (superEmbedUrl) {
    streams.push({
      name: 'SuperEmbed',
      description: `Multi-source stream - ${type === 'movie' ? 'Movie' : `S${season}E${episode}`} - Multiple providers`,
      title: 'SuperEmbed Stream',
      addonName: '🌐 SuperEmbed',
      addonId: 'superembed',
      quality: '1080p',
      url: superEmbedUrl,
      isTorrent: false,
      isEmbed: true,
      priority: 3,
    });
  }

  // NEW: VidSrc PRO (higher quality, if available)
  let vidsrcProUrl = '';
  if (type === 'movie') {
    vidsrcProUrl = `https://vidsrc.pro/embed/movie/${imdbId}`;
  } else if (season !== undefined && episode !== undefined) {
    vidsrcProUrl = `https://vidsrc.pro/embed/tv/${imdbId}/${season}/${episode}`;
  }

  if (vidsrcProUrl) {
    streams.push({
      name: 'VidSrc PRO (HD)',
      description: `Premium stream - ${type === 'movie' ? 'Movie' : `S${season}E${episode}`} - Higher quality`,
      title: 'VidSrc PRO Stream',
      addonName: '⭐ VidSrc PRO',
      addonId: 'vidsrc-pro',
      quality: '4K',
      url: vidsrcProUrl,
      isTorrent: false,
      isEmbed: true,
      priority: 0, // Highest priority
    });
  }

  // NEW: AutoSelect (tries multiple sources automatically)
  let autoSelectUrl = '';
  if (type === 'movie') {
    autoSelectUrl = `https://player.autoembed.cc/embed/movie/${imdbId}`;
  } else if (season !== undefined && episode !== undefined) {
    autoSelectUrl = `https://player.autoembed.cc/embed/tv/${imdbId}/${season}/${episode}`;
  }

  if (autoSelectUrl) {
    streams.push({
      name: 'AutoSelect (Smart)',
      description: `Auto-failover stream - ${type === 'movie' ? 'Movie' : `S${season}E${episode}`} - Switches sources automatically`,
      title: 'AutoSelect Stream',
      addonName: '🤖 AutoSelect',
      addonId: 'autoselect',
      quality: '1080p',
      url: autoSelectUrl,
      isTorrent: false,
      isEmbed: true,
      priority: 4,
    });
  }

  return streams;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${mb.toFixed(0)} MB`;
}

// ===== LOCAL LIBRARY (watchlist & history - stored in localStorage) =====
// Works without any account/server; if the user is signed in, the data is
// keyed per user (same keys the /watchlist and /history pages read).
function getLocalUserId(): string {
  try {
    return localStorage.getItem('authToken') || 'local';
  } catch {
    return 'local';
  }
}

function readStore<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function writeStore(key: string, items: any[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

function isInWatchlist(imdbId: string): boolean {
  const items = readStore<any>(`watchlist_${getLocalUserId()}`);
  return items.some(i => i.imdbId === imdbId);
}

function toggleWatchlist(item: MediaItem): boolean {
  const key = `watchlist_${getLocalUserId()}`;
  const items = readStore<any>(key);
  const imdbId = item.imdbId || item.id;
  const exists = items.some(i => i.imdbId === imdbId);
  if (exists) {
    writeStore(key, items.filter(i => i.imdbId !== imdbId));
    return false;
  }
  items.unshift({
    id: `${Date.now()}`,
    tmdbId: 0,
    imdbId,
    type: item.type,
    title: item.title,
    poster: item.poster || '',
    backdrop: item.backdrop || '',
    year: item.year || '',
    rating: item.rating,
    addedAt: new Date().toISOString(),
  });
  writeStore(key, items);
  return true;
}

function addToHistory(item: MediaItem, season?: number, episode?: number) {
  const key = `history_${getLocalUserId()}`;
  const items = readStore<any>(key);
  const imdbId = item.imdbId || item.id;
  // Remove previous entry for the same content so the most recent stays on top
  const filtered = items.filter(i => !(i.imdbId === imdbId && i.season === season && i.episode === episode));
  filtered.unshift({
    id: `${Date.now()}`,
    tmdbId: 0,
    imdbId,
    type: item.type,
    title: item.title,
    poster: item.poster || '',
    year: item.year || '',
    season,
    episode,
    progress: 0,
    lastWatchedAt: new Date().toISOString(),
  });
  writeStore(key, filtered.slice(0, 200));
}

// ===== WATCH PROGRESS =====
function historyKey(): string {
  return `history_${getLocalUserId()}`;
}

function readHistoryProgress(imdbId: string, season?: number, episode?: number): number {
  const items = readStore<any>(historyKey());
  const hit = items.find(i => i.imdbId === imdbId && (i.season ?? null) === (season ?? null) && (i.episode ?? null) === (episode ?? null));
  return typeof hit?.progress === 'number' ? hit.progress : 0;
}

// Writes progress into the existing history entry (creates one if needed).
// Writes localStorage directly - safe to call from high-frequency timeupdate.
function updateHistoryProgress(item: MediaItem, season: number | undefined, episode: number | undefined, pct: number) {
  try {
    const key = historyKey();
    const items = readStore<any>(key);
    const imdbId = item.imdbId || item.id;
    const idx = items.findIndex((i: any) => i.imdbId === imdbId && (i.season ?? null) === (season ?? null) && (i.episode ?? null) === (episode ?? null));
    if (idx >= 0) {
      items[idx].progress = Math.max(0, Math.min(100, pct));
      items[idx].lastWatchedAt = new Date().toISOString();
    } else {
      items.unshift({
        id: `${Date.now()}`, tmdbId: 0, imdbId, type: item.type, title: item.title,
        poster: item.poster || '', year: item.year || '', season, episode,
        progress: Math.max(0, Math.min(100, pct)), lastWatchedAt: new Date().toISOString(),
      });
    }
    writeStore(key, items.slice(0, 200));
  } catch {}
}

// ===== SUBTITLES =====
// SRT -> WebVTT conversion (works fully client-side)
function srtToVtt(srt: string): string {
  let body = srt.replace(/\r+/g, '').replace(/^\uFEFF/, '');
  body = body.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  const blocks = body.split(/\n\n+/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 2) {
      const startIndex = /^\d+$/.test(lines[0].trim()) ? 1 : 0;
      out.push(lines.slice(startIndex).join('\n'));
    }
  }
  return 'WEBVTT\n\n' + out.join('\n\n') + '\n\n';
}

function toVtt(content: string, fileName: string): string {
  const isVtt = /^\uFEFF?WEBVTT/.test(content.trim()) || fileName.toLowerCase().endsWith('.vtt');
  return isVtt ? content : srtToVtt(content);
}

// Parse VTT into cues for OUR OWN overlay renderer. <track> elements are
// silently not loaded by Chromium when the video source is cross-origin
// without CORS (our local engine streams) - proven by experiment - so we
// render subtitles ourselves; this works with ANY source origin.
interface VttCue { start: number; end: number; text: string; }
function parseVttCues(vtt: string): VttCue[] {
  const cues: VttCue[] = [];
  const ts = (raw: string): number => {
    const parts = raw.trim().split(':').map(Number);
    if (parts.some(n => isNaN(n))) return NaN;
    return parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1];
  };
  const blocks = vtt.replace(/^\uFEFF/, '').split(/\n\n+/);
  for (const block of blocks) {
    if (/^WEBVTT|^NOTE\b|^STYLE\b|^REGION\b/.test(block.trim())) continue;
    const lines = block.split('\n');
    const idx = lines.findIndex(l => l.includes('-->'));
    if (idx === -1) continue;
    const m = lines[idx].match(/([\d:.]+)\s*-->\s*([\d:.]+)/);
    if (!m) continue;
    const start = ts(m[1]), end = ts(m[2]);
    if (isNaN(start) || isNaN(end)) continue;
    const text = lines.slice(idx + 1).join('\n').replace(/<[^>]+>/g, '').trim();
    if (text) cues.push({ start, end, text });
  }
  return cues.sort((a, b) => a.start - b.start);
}

// OpenSubtitles.com search results -> simplified entries
interface SubtitleResult {
  fileId: number | undefined;
  fileName: string;
  language: string;
  release: string;
}

function parseOpenSubtitlesResponse(data: any): SubtitleResult[] {
  return (data.data || [])
    .map((s: any) => {
      const attrs = s.attributes || {};
      const file = (attrs.files || [])[0] || {};
      return {
        fileId: file.file_id,
        fileName: file.file_name || attrs.release || 'subtitle',
        language: attrs.language_name || attrs.language || '?',
        release: attrs.release || attrs.moviehash_match ? attrs.release || '' : '',
      };
    })
    .filter((s: SubtitleResult) => s.fileId !== undefined)
    .slice(0, 10);
}

// ===== MAIN COMPONENT =====
export default function LunaStreamApp() {
  const [view, setView] = useState<string>('home');
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [nowPlaying, setNowPlaying] = useState<MediaItem[]>([]);
  const [airingToday, setAiringToday] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [streams, setStreams] = useState<ResolvedStream[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addons, setAddons] = useState<AddonConfig[]>(DEFAULT_ADDONS);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [customAddonName, setCustomAddonName] = useState('');
  const [customAddonUrl, setCustomAddonUrl] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isTorrentPlaying, setIsTorrentPlaying] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);

  // Subtitles (built-in player)
  const [subPanelOpen, setSubPanelOpen] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [activeCue, setActiveCue] = useState<string>('');
  const [subStatus, setSubStatus] = useState('');
  const [subResults, setSubResults] = useState<any[]>([]);
  const [osKey, setOsKey] = useState('');
  const [subLang, setSubLang] = useState('en');

  const hlsRef = useRef<any>(null);
  const subFileRef = useRef<HTMLInputElement>(null);
  const engineUnsubRef = useRef<(() => void) | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerStageRef = useRef<HTMLDivElement>(null);
  const streamsRef = useRef<ResolvedStream[]>([]);
  const triedSourcesRef = useRef<Set<string>>(new Set());
  const playedOkRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceRef = useRef<(reason: string) => void>(() => {});
  const pendingSeekRef = useRef<number>(0);   // percent to seek to on load
  const lastSaveRef = useRef<number>(0);      // throttle for timeupdate saves
  const chromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const cwMetaRef = useRef<Record<string, { s?: number; e?: number }>>({});
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHint = useCallback((msg: string) => {
    setPlayerHint(msg);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setPlayerHint(null), 4000);
  }, []);

  // Player chrome (top bar) auto-hide: shows on any pointer/touch/key
  // activity or pause; hides after 4s while the video plays. The embed
  // player keeps its bar always visible (iframe events don't bubble out).
  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
    chromeTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !v.ended && !subPanelOpen) setChromeVisible(false);
    }, 4000);
  }, [subPanelOpen]);

  useEffect(() => {
    if (embedUrl || !(playingUrl || isTorrentPlaying)) { setChromeVisible(true); return; }
    bumpChrome();
    return () => { if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current); };
  }, [playingUrl, isTorrentPlaying, embedUrl, bumpChrome]);

  // Screen wake lock while OUR player streams (phones would otherwise dim).
  // Best-effort API: silently ignored where unsupported (desktop/TV).
  useEffect(() => {
    const want = (playingUrl || isTorrentPlaying) && !embedUrl;
    let released = false;
    (async () => {
      if (want) {
        try {
          if ((navigator as any).wakeLock) {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          }
        } catch {}
      } else {
        try { await wakeLockRef.current?.release?.(); } catch {}
        wakeLockRef.current = null;
        released = true;
      }
    })();
    return () => { if (!released) { try { wakeLockRef.current?.release?.(); } catch {} wakeLockRef.current = null; } };
  }, [playingUrl, isTorrentPlaying, embedUrl]);

  // Save current playback position into history (throttled).
  const saveProgressNow = useCallback((force: boolean = false) => {
    const v = videoRef.current;
    if (!v || !v.duration || !isFinite(v.duration) || !selectedItem) return;
    const now = Date.now();
    if (!force && now - lastSaveRef.current < 5000) return;
    lastSaveRef.current = now;
    const pct = Math.min(99.5, (v.currentTime / v.duration) * 100);
    updateHistoryProgress(selectedItem, selectedItem.type === 'series' ? selectedSeason : undefined, selectedItem.type === 'series' ? selectedEpisode : undefined, pct);
  }, [selectedItem, selectedSeason, selectedEpisode]);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
  }, []);

  // keep a ref to the live streams list for watchdog callbacks
  useEffect(() => { streamsRef.current = streams; }, [streams]);

  // Embed sources often show an ad gate and never actually start the movie.
  // Auto-advance to the next source unless the user opts to stay.
  useEffect(() => {
    if (!embedUrl) { setEmbedCountdown(null); return; }
    setEmbedCountdown(30);
    const iv = setInterval(() => {
      setEmbedCountdown(c => (c === null ? null : c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [embedUrl]);

  const [isMobile, setIsMobile] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [embedCountdown, setEmbedCountdown] = useState<number | null>(null);
  const [playerHint, setPlayerHint] = useState<string | null>(null);
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([]);
  const [chromeVisible, setChromeVisible] = useState(true);

  // Mobile layout switch: phones get a top bar + bottom nav instead of the sidebar
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Track player fullscreen state (desktop browsers + Android WebView native bridge)
  useEffect(() => {
    const onFsChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = playerStageRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // WebView may reject programmatic fullscreen; native back still exits
    }
  }, []);

  // Load addons from localStorage; new default addons (e.g. Torrentio) are
  // merged into existing installs so upgrades get them too - user
  // enable/disable choices are preserved.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lunastream_addons');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const merged = [...parsed];
        for (const d of DEFAULT_ADDONS) {
          if (!merged.some((a: AddonConfig) => a.id === d.id)) merged.push(d);
        }
        setAddons(merged);
        localStorage.setItem('lunastream_addons', JSON.stringify(merged));
      }
    } catch {}
  }, []);

  const saveAddons = useCallback((newAddons: AddonConfig[]) => {
    setAddons(newAddons);
    localStorage.setItem('lunastream_addons', JSON.stringify(newAddons));
  }, []);

  // Load home page data from Cinemeta via proxy
  useEffect(() => {
    async function loadHome() {
      setLoading(true);
      try {
        const [topMovies, topSeries, popularMov, popularSer] = await Promise.all([
          fetchViaProxy(`${CINEMETA_URL}/catalog/movie/top.json`),
          fetchViaProxy(`${CINEMETA_URL}/catalog/series/top.json`),
          fetchViaProxy(`${CINEMETA_URL}/catalog/movie/popular.json`),
          fetchViaProxy(`${CINEMETA_URL}/catalog/series/popular.json`),
        ]);

        if (topMovies?.metas) {
          setTrending(topMovies.metas.slice(0, 20).map(mapMeta('movie')));
        }
        if (topSeries?.metas) {
          setAiringToday(topSeries.metas.slice(0, 20).map(mapMeta('series')));
        }
        if (popularMov?.metas) {
          setPopularMovies(popularMov.metas.map(mapMeta('movie')));
        }
        if (popularSer?.metas) {
          setPopularSeries(popularSer.metas.map(mapMeta('series')));
        }
      } catch (e) {
        console.error('Error loading home data:', e);
      }
      setLoading(false);
    }
    loadHome();
  }, []);

  function mapMeta(type: 'movie' | 'series') {
    return (m: any): MediaItem => ({
      id: m.id,
      type,
      title: m.name,
      poster: m.poster,
      backdrop: m.poster,
      year: m.releaseInfo,
      imdbId: m.id,
    });
  }

  // Select item
  const selectItem = useCallback(async (item: MediaItem) => {
    clearWatchdog();
    triedSourcesRef.current.clear();
    setSelectedItem(item);
    setStreams([]);
    setPlayingUrl(null);
    setStreamError(null);
    setLoadingStreams(true);
    setInWatchlist(isInWatchlist(item.imdbId || item.id));

    try {
      // Fetch full metadata from Cinemeta
      const meta = await fetchViaProxy(`${CINEMETA_URL}/meta/${item.type}/${item.imdbId}.json`);
      
      if (meta?.meta) {
        const fullItem: MediaItem = {
          ...item,
          overview: meta.meta.description || meta.meta.overview || item.overview,
          rating: meta.meta.imdbRating ? parseFloat(meta.meta.imdbRating) : item.rating,
          year: meta.meta.releaseInfo || item.year,
          genres: meta.meta.genres || [],
          runtime: meta.meta.runtime || '',
        };
        setSelectedItem(fullItem);

        // If series, load seasons/episodes
        if (item.type === 'series' && meta.meta.videos) {
          const vids = meta.meta.videos as any[];
          const uniqueSeasons = Array.from(new Set(vids.map(v => v.season).filter(Boolean))).sort((a, b) => (a as number) - (b as number));
          setSeasons(uniqueSeasons.map((s: number) => ({
            season_number: s,
            name: `Season ${s}`,
            episode_count: vids.filter(v => v.season === s).length,
          })));
          
          if (uniqueSeasons.length > 0) {
            const firstSeason = uniqueSeasons[0] as number;
            setSelectedSeason(firstSeason);
            const eps = vids
              .filter(v => v.season === firstSeason)
              .sort((a, b) => a.episode - b.episode);
            setEpisodes(eps);
            if (eps.length > 0) setSelectedEpisode(eps[0].episode);
          }
        }
      }

      // Fetch streams
      const imdbId = item.imdbId || item.id;
      const resolvedStreams = await resolveAllStreams(addons, item.type, imdbId, undefined, undefined, item.title);
      setStreams(resolvedStreams);
      
      if (resolvedStreams.length === 0) {
        setStreamError('No streams found from add-ons. Try another movie/series or configure add-ons with debrid services.');
      }
    } catch (e) {
      console.error('Error selecting item:', e);
      setStreamError('Error loading streams. Please try again.');
    }
    setLoadingStreams(false);
  }, [addons]);

  // Handle season/episode change
  // Deep link support: /?open=tt123456&s=1&e=2 (used by My List & History
  // pages, which are standalone routes). Runs once on mount.
  const deepLinkRanRef = useRef(false);
  useEffect(() => {
    if (deepLinkRanRef.current) return;
    deepLinkRanRef.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const open = params.get('open');
      if (!open || !open.startsWith('tt')) return;
      const sNum = params.get('s') ? Number(params.get('s')) : undefined;
      const eNum = params.get('e') ? Number(params.get('e')) : undefined;
      (async () => {
        // Query BOTH types: Cinemeta returns junk matches for the wrong type,
        // so decide by data shape - a real series meta has a videos[] array.
        const [mvRes, srRes] = await Promise.allSettled([
          fetchViaProxy(`${CINEMETA_URL}/meta/movie/${open}.json`),
          fetchViaProxy(`${CINEMETA_URL}/meta/series/${open}.json`),
        ]);
        const mv = mvRes.status === 'fulfilled' ? mvRes.value?.meta : null;
        const sr = srRes.status === 'fulfilled' ? srRes.value?.meta : null;
        let meta: any = null;
        let t: 'movie' | 'series' = 'movie';
        if (sr && Array.isArray(sr.videos) && sr.videos.length > 0) { meta = sr; t = 'series'; }
        else if (mv?.name) { meta = mv; t = 'movie'; }
        else if (sr?.name) { meta = sr; t = 'series'; }
        const mapped: MediaItem | null = meta ? mapMeta(t)(meta) : null;
        if (mapped) {
          await selectItem(mapped);
          if (mapped.type === 'series' && sNum !== undefined && eNum !== undefined) {
            try { await changeEpisode(sNum, eNum); } catch {}
          }
        }
        window.history.replaceState(null, '', window.location.pathname);
      })();
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeEpisode = useCallback(async (season: number, episode: number) => {
    if (!selectedItem) return;
    clearWatchdog();
    triedSourcesRef.current.clear();
    setSelectedSeason(season);
    setSelectedEpisode(episode);
    setLoadingStreams(true);
    setStreamError(null);
    setPlayingUrl(null);

    try {
      const imdbId = selectedItem.imdbId || selectedItem.id;
      const resolved = await resolveAllStreams(addons, 'series', imdbId, season, episode, selectedItem.title);
      setStreams(resolved);
      if (resolved.length === 0) {
        setStreamError('No streams found for this episode. Try a different one or configure add-ons.');
      }
    } catch {
      setStreams([]);
      setStreamError('Error loading streams.');
    }
    setLoadingStreams(false);
  }, [selectedItem, addons]);

  // Load episodes when season changes
  useEffect(() => {
    if (selectedItem?.type === 'series' && selectedItem.imdbId) {
      fetchViaProxy(`${CINEMETA_URL}/meta/series/${selectedItem.imdbId}.json`).then(d => {
        if (d?.meta?.videos) {
          const eps = d.meta.videos
            .filter((v: any) => v.season === selectedSeason)
            .sort((a: any, b: any) => a.episode - b.episode);
          setEpisodes(eps);
        }
      });
    }
  }, [selectedSeason, selectedItem?.imdbId]);

  // Play stream
  const selectContinue = useCallback(async (item: MediaItem) => {
    const m = cwMetaRef.current[item.imdbId || item.id];
    await selectItem(item);
    if (m && item.type === 'series' && m.s !== undefined && m.e !== undefined) {
      try { await changeEpisode(m.s, m.e); } catch {}
    }
  }, [selectItem, changeEpisode]);

  const playStream = useCallback(async (stream: ResolvedStream) => {
    const url = stream.url || stream.externalUrl;
    if (!url) return;

    setStreamError(null);
    triedSourcesRef.current.add(url);

    // Resume: if this title/episode was partially watched, seek there on load
    try {
      const saved = readHistoryProgress(
        selectedItem?.imdbId || selectedItem?.id || '',
        selectedItem?.type === 'series' ? selectedSeason : undefined,
        selectedItem?.type === 'series' ? selectedEpisode : undefined
      );
      pendingSeekRef.current = saved >= 2 && saved < 95 ? saved : 0;
    } catch { pendingSeekRef.current = 0; }

    // Watchdog: if a torrent attempt has not produced a playable stream within
    // 100s (no peers / dead torrent), automatically move to the next source.
    if (url.startsWith('magnet:')) {
      playedOkRef.current = false;
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        if (!playedOkRef.current) autoAdvanceRef.current('Torrent timed out');
      }, 100000);
    }

    // Record in watch history (local, no account needed)
    if (selectedItem) {
      addToHistory(selectedItem, selectedItem.type === 'series' ? selectedSeason : undefined, selectedItem.type === 'series' ? selectedEpisode : undefined);
    }

    // Check if it's an embed stream (iframe-based)
    if (stream.isEmbed) {
      // Set embed URL to show in iframe player
      setEmbedUrl(url);
      return;
    }

    // Check if it's a magnet link (torrent)
    if (url.startsWith('magnet:')) {
      setIsTorrentPlaying(true);
      setLoadingStreams(true);

      // Preferred: desktop torrent engine (Electron main process) - full
      // TCP/uTP swarm access, played through OUR player, zero ads.
      const luna = (window as any).lunaTorrent;
      if (!luna?.play && (window as any).LunaTorrent?.play) {
        // Android native engine (jlibtorrent + local HTTP server)
        try {
          setStreamError('Connecting to torrent network…');
          const id = String(Date.now());
          (window as any).LunaTorrent.play(url, id);
          const result: any = await new Promise((resolve) => {
            let tries = 0;
            const iv = setInterval(() => {
              tries++;
              let st: any = null;
              try { st = JSON.parse((window as any).LunaTorrent.status(id) || '{}'); } catch {}
              if (st?.state === 'ready') { clearInterval(iv); resolve(st); }
              else if (st?.state === 'error') { clearInterval(iv); resolve(st); }
              else {
                if (st?.state === 'downloading') setStreamError(st.message || 'Buffering…');
                else if (st?.message) setStreamError(st.message);
                if (tries > 130) { clearInterval(iv); resolve({ state: 'error', message: 'Timed out looking for sources.' }); }
              }
            }, 700);
          });
          if (result.state !== 'ready') throw new Error(result.message || 'Torrent engine failed');
          setLoadingStreams(false);
          setIsTorrentPlaying(false);
          setStreamError(null);
          playedOkRef.current = true;
          clearWatchdog();
          setPlayingUrl(result.url);
          return;
        } catch (androidErr: any) {
          console.error('Android torrent engine failed, falling back to WebTorrent:', androidErr?.message);
        }
      }
      if (luna?.play) {
        try {
          setStreamError('Connecting to torrent network…');
          engineUnsubRef.current = luna.onProgress?.((d: any) => {
            setStreamError(`⬇ ${(d.progress * 100).toFixed(1)}% | ${(d.speed / 1024 / 1024).toFixed(2)} MB/s | ${d.peers} peers`);
          });
          const r = await luna.play(url);
          if (!r || r.error) throw new Error(r?.error || 'Torrent engine failed');
          engineUnsubRef.current?.();
          engineUnsubRef.current = null;
          setLoadingStreams(false);
          setIsTorrentPlaying(false);
          setStreamError(null);
          playedOkRef.current = true;
          clearWatchdog();
          setPlayingUrl(r.url);
          return;
        } catch (engineErr: any) {
          // Engine unavailable/failed (e.g. no peers yet) -> fall back to the
          // in-browser WebTorrent client below.
          engineUnsubRef.current?.();
          engineUnsubRef.current = null;
          console.error('Desktop engine failed, falling back to WebTorrent:', engineErr?.message);
        }
      }

      try {
        setStreamError('Connecting to torrent network... This may take 30-60 seconds to buffer.');

        // Ensure WebTorrent is loaded
        if (typeof window === 'undefined' || !(window as any).WebTorrent) {
          // Load WebTorrent from CDN
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@2.5.1/webtorrent.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load WebTorrent'));
            document.head.appendChild(script);
          });
        }

        const WebTorrentLib = (window as any).WebTorrent;
        if (!WebTorrentLib) {
          setStreamError('WebTorrent library failed to load');
          setLoadingStreams(false);
          setIsTorrentPlaying(false);
          return;
        }

        // Cleanup previous client
        if ((window as any).__webtorrent_client) {
          (window as any).__webtorrent_client.destroy();
        }

        const client = new WebTorrentLib();
        (window as any).__webtorrent_client = client;
        client.on('error', (err: any) => {
          console.error('WebTorrent client error:', err?.message || err);
          if (!playedOkRef.current) autoAdvanceRef.current('Torrent failed');
        });

        client.add(url, (torrent: any) => {
          // Get the video file (largest file, likely the video)
          const videoFile = torrent.files
            .sort((a: any, b: any) => b.length - a.length)
            .find((f: any) => f.name.match(/\.(mp4|mkv|avi|mov|webm|m4v)$/i))
            || torrent.files.sort((a: any, b: any) => b.length - a.length)[0];

          if (!videoFile) {
            client.destroy();
            autoAdvanceRef.current('No video file found in torrent');
            return;
          }

          // Render to video element
          const videoEl = videoRef.current;
          if (videoEl) {
            videoFile.renderTo(videoEl, { autoplay: true }, (err: any) => {
              if (err) {
                setStreamError(`Playback error: ${err.message}`);
                autoAdvanceRef.current('Playback error');
                return;
              }
              playedOkRef.current = true;
              clearWatchdog();
              setLoadingStreams(false);
              setStreamError(null);
            });
          }

          // Update progress
          torrent.on('download', () => {
            const progress = (torrent.progress * 100).toFixed(1);
            const speed = (torrent.downloadSpeed / 1024 / 1024).toFixed(2);
            const peers = torrent.numPeers;
            setStreamError(`⬇ ${progress}% | ${speed} MB/s | ${peers} peers`);
          });

          torrent.on('done', () => {
            setStreamError(null);
          });
        });
      } catch (error: any) {
        setStreamError(`Error: ${error.message}`);
        setLoadingStreams(false);
        setIsTorrentPlaying(false);
      }
    } else {
      // Direct URL playback
      setPlayingUrl(url);
    }
  }, [selectedItem, selectedSeason, selectedEpisode]);

  // Toggle watchlist for the selected item
  const handleToggleWatchlist = useCallback(() => {
    if (!selectedItem) return;
    const added = toggleWatchlist(selectedItem);
    setInWatchlist(added);
  }, [selectedItem]);

  // ===== SUBTITLES =====
  // Read user settings (OpenSubtitles API key + preferred language)
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('lunastream_settings') || '{}');
      setOsKey(s.opensubtitlesApiKey || '');
      setSubLang(s.subtitleLanguage || 'en');
    } catch {}
  }, [selectedItem, playingUrl, embedUrl]);

  // Subtitle overlay: derive cues + track the active one on time updates
  const subtitleCues = useMemo(() => (subtitleText ? parseVttCues(subtitleText) : []), [subtitleText]);

  const updateActiveCue = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const cue = subtitleCues.find(c => t >= c.start && t < c.end);
    setActiveCue(prev => {
      const next = cue ? cue.text : '';
      return next === prev ? prev : next;
    });
  }, [subtitleCues]);

  // Attach subtitle content (converted to VTT) for the overlay renderer
  const attachSubtitleContent = useCallback((content: string, fileName: string) => {
    setSubtitleText(toVtt(content, fileName));
    setActiveCue('');
    setSubPanelOpen(false);
    setSubStatus('');
  }, []);

  const handleSubtitleFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      attachSubtitleContent(text, file.name);
    } catch {
      setSubStatus('Could not read the subtitle file.');
    }
  }, [attachSubtitleContent]);

  const searchSubtitles = useCallback(async () => {
    if (!selectedItem) return;
    setSubResults([]);
    if (!osKey) {
      setSubStatus('No API key. Create a free account at opensubtitles.com and paste your API key in Settings -> Subtitles.');
      return;
    }
    setSubStatus('Searching OpenSubtitles…');
    try {
      const params = new URLSearchParams({
        imdb_id: selectedItem.imdbId || selectedItem.id,
        languages: subLang || 'en',
      });
      if (selectedItem.type === 'series') {
        params.set('season_number', String(selectedSeason));
        params.set('episode_number', String(selectedEpisode));
      }
      const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${params}`, {
        headers: { 'Api-Key': osKey, Accept: 'application/json' },
      });
      if (res.status === 401 || res.status === 403) {
        setSubStatus('API key rejected. Check your OpenSubtitles key in Settings.');
        return;
      }
      const data = await res.json();
      const results = parseOpenSubtitlesResponse(data);
      setSubResults(results);
      setSubStatus(results.length ? `${results.length} results for "${subLang}"` : 'No subtitles found for this language.');
    } catch {
      setSubStatus('Search failed (network error).');
    }
  }, [selectedItem, osKey, subLang, selectedSeason, selectedEpisode]);

  const downloadSubtitle = useCallback(async (item: SubtitleResult) => {
    setSubStatus('Downloading subtitle…');
    try {
      const res = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: { 'Api-Key': osKey, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: item.fileId }),
      });
      const data = await res.json();
      if (!res.ok || !data.link) {
        setSubStatus(data.message || 'Download failed (free accounts are rate-limited).');
        return;
      }
      const fileRes = await fetch(data.link);
      const text = await fileRes.text();
      attachSubtitleContent(text, data.file_name || item.fileName);
    } catch {
      setSubStatus('Download failed (network error).');
    }
  }, [osKey, attachSubtitleContent]);

  // ===== STABILITY: failover to the next source =====
  const playNextStream = useCallback(() => {
    if (!streams.length) return;
    const currentUrl = playingUrl || embedUrl || '';
    const idx = streams.findIndex(s => (s.url || s.externalUrl || '') === currentUrl);
    const next = streams[(idx + 1) % streams.length];
    if (next) playStream(next);
  }, [streams, playingUrl, embedUrl, playStream]);

  // Auto-failover: move to the next UNTRIED source; give up after all tried.
  autoAdvanceRef.current = (reason: string) => {
    const list = streamsRef.current;
    const currentUrl = playingUrl || embedUrl || '';
    const idx = list.findIndex(s => (s.url || s.externalUrl || '') === currentUrl);
    for (let i = 1; i <= list.length; i++) {
      const cand = list[(idx + i + list.length) % list.length];
      const cu = cand.url || cand.externalUrl || '';
      if (cu && !triedSourcesRef.current.has(cu)) {
        console.info('auto-advance:', reason);
        playStream(cand);
        return;
      }
    }
    // exhausted - close the player, explain, let the user retry manually
    clearWatchdog();
    setEmbedUrl(null);
    setPlayingUrl(null);
    setIsTorrentPlaying(false);
    setLoadingStreams(false);
    setStreamError(`${reason}. All ${list.length} source${list.length === 1 ? '' : 's'} tried — none played. Check your connection, or try again / another title.`);
  };

  // HLS (m3u8) support via hls.js - native HLS only exists on Safari,
  // so on Windows/Android/Linux we must feed the stream through MSE.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playingUrl || playingUrl.startsWith('magnet:')) return;
    if (!/\.m3u8($|\?)/i.test(playingUrl)) return;

    let cancelled = false;
    (async () => {
      const mod = await import('hls.js');
      const Hls = mod.default;
      if (cancelled) return;
      if (!Hls.isSupported()) {
        if (!video.canPlayType('application/vnd.apple.mpegurl')) {
          setStreamError('HLS is not supported on this device. Try another source.');
        }
        return;
      }
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
        if (data && data.fatal) {
          setStreamError('Stream failed to load. Try another source.');
        }
      });
      hls.loadSource(playingUrl);
      hls.attachMedia(video);
    })().catch(() => setStreamError('Player initialization failed. Try another source.'));

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };
  }, [playingUrl]);

  // Reset subtitle track when playback changes
  useEffect(() => {
    if (subtitleText) {
      setSubtitleText('');
      setActiveCue('');
    }
    setSubPanelOpen(false);
    setSubResults([]);
    setSubStatus('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingUrl, embedUrl]);

  // Toggle addon
  const toggleAddon = useCallback((id: string) => {
    const updated = addons.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    saveAddons(updated);
  }, [addons, saveAddons]);

  // Add custom addon
  const addCustomAddon = useCallback(() => {
    if (!customAddonName || !customAddonUrl) return;
    const newAddon: AddonConfig = {
      id: `custom_${Date.now()}`,
      name: customAddonName,
      url: customAddonUrl.replace(/\/$/, ''),
      enabled: true,
      types: ['movie', 'series'],
    };
    saveAddons([...addons, newAddon]);
    setCustomAddonName('');
    setCustomAddonUrl('');
  }, [customAddonName, customAddonUrl, addons, saveAddons]);

  // Remove addon
  const removeAddon = useCallback((id: string) => {
    saveAddons(addons.filter(a => a.id !== id));
  }, [addons, saveAddons]);

  // Search - queries both movies and series
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    try {
      const q = encodeURIComponent(query);
      const [moviesData, seriesData] = await Promise.all([
        fetchViaProxy(`${CINEMETA_URL}/catalog/movie/top/search=${q}.json`),
        fetchViaProxy(`${CINEMETA_URL}/catalog/series/top/search=${q}.json`),
      ]);
      const movies: MediaItem[] = moviesData?.metas ? moviesData.metas.map(mapMeta('movie')) : [];
      const series: MediaItem[] = seriesData?.metas ? seriesData.metas.map(mapMeta('series')) : [];
      setSearchResults([...movies, ...series]);
    } catch {
      setSearchResults([]);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => performSearch(searchQuery), 500);
    return () => clearTimeout(timeout);
  }, [searchQuery, performSearch]);

  // Continue Watching: derive from history (entries 2-95% watched), latest first
  useEffect(() => {
    if (view !== 'home') return;
    try {
      const items = readStore<any>(historyKey());
      const meta: Record<string, { s?: number; e?: number }> = {};
      const seen = new Set<string>();
      const rows: MediaItem[] = [];
      for (const h of items) {
        if (typeof h.progress !== 'number' || h.progress < 2 || h.progress >= 95) continue;
        if (seen.has(h.imdbId)) continue;
        seen.add(h.imdbId);
        meta[h.imdbId] = { s: h.season ?? undefined, e: h.episode ?? undefined };
        rows.push({ id: h.imdbId, type: h.type === 'series' ? 'series' : 'movie', title: h.title, poster: h.poster, year: h.year });
      }
      cwMetaRef.current = meta;
      setContinueWatching(rows.slice(0, 12));
    } catch {}
  }, [view]);

  // Hero item
  const heroItem = trending[0];

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      {!isMobile && (
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-[#0d0d20] border-r border-[#1a1a3e] flex flex-col transition-all duration-300 fixed h-full z-40`}>
        <div className="p-4 flex items-center gap-3 border-b border-[#1a1a3e]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            L
          </div>
          {sidebarOpen && <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">LunaStream</span>}
        </div>
        
        <nav className="flex-1 p-2 space-y-1">
          {[
            { icon: Home, label: 'Home', id: 'home' },
            { icon: Film, label: 'Movies', id: 'movies' },
            { icon: Tv, label: 'Series', id: 'series' },
            { icon: Search, label: 'Search', id: 'search' },
            { icon: Settings, label: 'Add-ons', id: 'addons' },
          ].map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              onClick={() => { setView(id); setSelectedItem(null); setPlayingUrl(null); setEmbedUrl(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                view === id ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:bg-[#1a1a3e] hover:text-white'
              }`}
            >
              <Icon size={20} />
              {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
            </button>
          ))}

          {/* Links to standalone pages (stored locally, no account needed) */}
          <div className="border-t border-[#1a1a3e] my-2" />
          {[
            { icon: Bookmark, label: 'My List', href: '/watchlist' },
            { icon: Clock, label: 'History', href: '/history' },
            { icon: Settings, label: 'Settings', href: '/settings' },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-gray-400 hover:bg-[#1a1a3e] hover:text-white"
            >
              <Icon size={20} />
              {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
            </Link>
          ))}
        </nav>
        
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 border-t border-[#1a1a3e] text-gray-400 hover:text-white">
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </aside>
      )}

      {/* Mobile chrome: top bar + bottom navigation (thumb-friendly) */}
      {isMobile && (
        <>
          <header className="fixed top-0 left-0 right-0 h-14 bg-[#0d0d20]/95 backdrop-blur border-b border-[#1a1a3e] flex items-center px-3 z-40">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              L
            </div>
            <span className="ml-2 font-bold text-lg bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">LunaStream</span>
            <Link href="/watchlist" className="ml-auto p-2.5 text-gray-300 active:text-purple-400" aria-label="My List">
              <Bookmark size={22} />
            </Link>
            <Link href="/history" className="p-2.5 text-gray-300 active:text-purple-400" aria-label="History">
              <Clock size={22} />
            </Link>
            <Link href="/settings" className="p-2.5 text-gray-300 active:text-purple-400" aria-label="Settings">
              <Settings size={22} />
            </Link>
          </header>
          <nav className="fixed bottom-0 left-0 right-0 bg-[#0d0d20]/95 backdrop-blur border-t border-[#1a1a3e] flex z-40 pb-[env(safe-area-inset-bottom)]">
            {[
              { icon: Home, label: 'Home', id: 'home' },
              { icon: Film, label: 'Movies', id: 'movies' },
              { icon: Tv, label: 'Series', id: 'series' },
              { icon: Search, label: 'Search', id: 'search' },
              { icon: Settings, label: 'Add-ons', id: 'addons' },
            ].map(({ icon: Icon, label, id }) => (
              <button
                key={id}
                onClick={() => { setView(id); setSelectedItem(null); setPlayingUrl(null); setEmbedUrl(null); }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-2 ${view === id ? 'text-purple-400' : 'text-gray-500'}`}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isMobile ? 'pt-14 pb-20' : sidebarOpen ? 'ml-60' : 'ml-16'} transition-all duration-300`}>
        {/* Embed Player */}
        {embedUrl && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col relative">
            <div className="flex items-center justify-between p-4 bg-black/80">
              <button onClick={() => { setEmbedUrl(null); clearWatchdog(); }} className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors">
                <ArrowLeft size={20} /> Back
              </button>
              <span className="text-sm text-gray-300 truncate max-w-md">{selectedItem?.title}</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={playNextStream}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                  title="If this source doesn't load, try the next one"
                >
                  <SkipForward size={16} /> Next source
                </button>
                <button
                  onClick={() => window.open(embedUrl, '_blank')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  <ExternalLink size={16} /> Open in new tab
                </button>
              </div>
            </div>
            {embedCountdown !== null && (
              <div className="absolute bottom-14 right-3 z-20 bg-black/85 backdrop-blur border border-purple-500/30 rounded-lg px-3 py-2 flex items-center gap-2 text-xs max-w-[92vw]">
                <Loader2 size={13} className="animate-spin text-purple-400 flex-shrink-0" />
                <span className="text-gray-300 whitespace-nowrap">{embedCountdown > 0 ? `Next source in ${embedCountdown}s` : 'Switching…'}</span>
                <button onClick={() => setEmbedCountdown(null)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 whitespace-nowrap">Stay</button>
                <button onClick={() => autoAdvanceRef.current('Skipping source')} className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 flex items-center gap-1 whitespace-nowrap"><SkipForward size={11} /> Next</button>
              </div>
            )}
            <div className="flex-1 relative">
              {/* NOTE: intentionally no `sandbox` attribute - these providers
                  refuse to run inside sandboxed frames ("This content can't be
                  embedded in a sandboxed frame"). They are designed for plain
                  iframe embedding. Ad popups opened by them are redirected to
                  the system browser / ignored on mobile, and never take over
                  the app window (Electron blocks top-level navigation). */}
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
            <div className="bg-black/80 px-4 py-2 text-center text-xs text-gray-500">
              Player not loading? Use <span className="text-gray-300">Next source</span> to switch stream.
            </div>
          </div>
        )}

        {/* Video Player */}
        {(playingUrl || isTorrentPlaying) && (
          <div
            className="fixed inset-0 z-50 bg-black flex flex-col"
            onPointerMove={bumpChrome}
            onTouchStart={bumpChrome}
            onKeyDown={bumpChrome}
          >
            <div className={`flex items-center justify-between p-4 bg-black/80 transition-all duration-300 ${chromeVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
              <button onClick={() => {
                saveProgressNow(true);
                setPlayingUrl(null);
                setIsTorrentPlaying(false);
                setStreamError(null);
                clearWatchdog();
                if ((window as any).__webtorrent_client) {
                  (window as any).__webtorrent_client.destroy();
                  (window as any).__webtorrent_client = null;
                }
                try { (window as any).lunaTorrent?.stop?.(); } catch {}
                engineUnsubRef.current?.();
                engineUnsubRef.current = null;
              }} className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors">
                <ArrowLeft size={20} /> Back
              </button>
              <span className="text-sm text-gray-300 truncate max-w-md">{selectedItem?.title}</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={playNextStream}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                  title="Try the next stream source"
                >
                  <SkipForward size={16} /> Next
                </button>
                <button
                  onClick={() => setSubPanelOpen(!subPanelOpen)}
                  className={`flex items-center gap-2 transition-colors text-sm ${subtitleText ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
                  title="Subtitles"
                >
                  <Subtitles size={18} /> Subtitles
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-2 transition-colors text-sm text-gray-400 hover:text-white"
                  title="Fullscreen"
                >
                  {isFs ? <Minimize size={18} /> : <Maximize size={18} />} Fullscreen
                </button>
              </div>
            </div>

            {/* Subtitles panel */}
            {subPanelOpen && (
              <div className="absolute top-16 right-4 z-10 w-[calc(100vw-2rem)] sm:w-80 bg-[#111128] border border-[#1a1a3e] rounded-xl shadow-2xl p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                <p className="text-sm font-medium text-white">Subtitles</p>

                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a3e] hover:bg-[#2a2a5e] cursor-pointer text-sm text-gray-300 transition-colors">
                  <Upload size={16} />
                  Load .srt / .vtt file…
                  <input
                    type="file"
                    accept=".srt,.vtt,text/vtt,application/x-subrip"
                    className="hidden"
                    onChange={(e) => handleSubtitleFile(e.target.files?.[0])}
                  />
                </label>

                <div className="border-t border-[#1a1a3e]" />

                {osKey ? (
                  <button
                    onClick={searchSubtitles}
                    className="w-full px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition-colors"
                  >
                    Search OpenSubtitles ({subLang})
                  </button>
                ) : (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    To search online, paste a free OpenSubtitles API key in
                    Settings → Subtitles, or just load a .srt file above.
                  </p>
                )}

                {subResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => downloadSubtitle(r)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[#0b0b1a] hover:bg-[#1a1a3e] transition-colors"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300 mr-2">{r.language}</span>
                    <span className="text-xs text-gray-400 truncate inline-block max-w-[180px] align-middle">{r.fileName}</span>
                  </button>
                ))}

                {subStatus && <p className="text-xs text-gray-500">{subStatus}</p>}
              </div>
            )}

            <div ref={playerStageRef} onDoubleClick={toggleFullscreen} className="flex-1 flex items-center justify-center bg-black relative">
              {activeCue && (
                <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[92%] text-center px-4">
                  <span className="whitespace-pre-line inline-block text-white text-base sm:text-lg md:text-2xl font-medium leading-snug"
                    style={{ textShadow: '0 0 4px #000, 0 1px 3px #000, 0 -1px 3px #000, 1px 0 3px #000, -1px 0 3px #000' }}>
                    {activeCue}
                  </span>
                </div>
              )}
              <video
                ref={videoRef}
                src={playingUrl && !playingUrl.startsWith('magnet:') && !/\.m3u8($|\?)/i.test(playingUrl) ? playingUrl : undefined}
                controls
                autoPlay
                playsInline
                className={`w-full h-full ${isFs ? 'max-h-full' : 'max-h-[calc(100vh-60px)]'} object-contain`}
                onTimeUpdate={() => { saveProgressNow(false); updateActiveCue(); }}
                onSeeked={updateActiveCue}
                onRateChange={updateActiveCue}
                onPlay={bumpChrome}
                onPause={() => setChromeVisible(true)}
                onEnded={() => {
                  if (selectedItem) updateHistoryProgress(selectedItem, selectedItem.type === 'series' ? selectedSeason : undefined, selectedItem.type === 'series' ? selectedEpisode : undefined, 100);
                }}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (pendingSeekRef.current > 0 && v.duration && isFinite(v.duration)) {
                    try { v.currentTime = (pendingSeekRef.current / 100) * v.duration; } catch {}
                    showHint(`Resumed at ${Math.round(pendingSeekRef.current)}%`);
                  }
                  pendingSeekRef.current = 0;
                }}
                onError={() => {
                  if (!isTorrentPlaying) {
                    setStreamError('Playback error. Trying the next source…');
                    autoAdvanceRef.current('Playback error');
                  }
                }}
              >
                {playingUrl && !playingUrl.startsWith('magnet:') && (
                  <source src={playingUrl} />
                )}
                Your browser does not support video playback.
              </video>
            </div>
            {playerHint && !streamError && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/85 border border-purple-500/40 text-purple-200 px-4 py-2 rounded-lg text-sm">
                {playerHint}
              </div>
            )}
            {streamError && isTorrentPlaying && (
              <div className="absolute bottom-20 left-4 right-4 bg-black/80 border border-purple-500/30 text-white px-4 py-3 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-purple-400" />
                  <span className="text-purple-300">{streamError}</span>
                </div>
              </div>
            )}
            {streamError && !isTorrentPlaying && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-3">
                <span>{streamError}</span>
                <button
                  onClick={playNextStream}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs"
                >
                  <SkipForward size={12} /> Try next source
                </button>
              </div>
            )}
          </div>
        )}

        {/* Detail View */}
        {selectedItem && !playingUrl && !isTorrentPlaying && !embedUrl ? (
          <div className="animate-fadeIn">
            {/* Backdrop */}
            <div className="relative h-[36vh] sm:h-[44vh] md:h-[50vh] overflow-hidden">
              {selectedItem.backdrop ? (
                <img src={selectedItem.backdrop} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a1a3e] to-[#0d0d20]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b1a] via-[#0b0b1a]/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                <div className="flex gap-4 sm:gap-6 items-end">
                  {selectedItem.poster && (
                    <img src={selectedItem.poster} alt="" className="w-24 h-36 sm:w-28 sm:h-40 md:w-32 md:h-48 object-cover rounded-lg shadow-2xl -mb-8 sm:-mb-10 md:-mb-12 border-2 border-[#1a1a3e]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">{selectedItem.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                      {selectedItem.year && <span>{selectedItem.year}</span>}
                      {selectedItem.rating && (
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          {selectedItem.rating.toFixed(1)}
                        </span>
                      )}
                      {selectedItem.runtime && <span>{selectedItem.runtime}</span>}
                      <span className="px-2 py-0.5 bg-purple-600/30 rounded text-purple-300 text-xs uppercase">{selectedItem.type}</span>
                    </div>
                    <button
                      onClick={handleToggleWatchlist}
                      className={`mt-3 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        inWatchlist
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#1a1a3e] text-gray-300 hover:text-white border border-[#2a2a5e]'
                      }`}
                    >
                      {inWatchlist ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      {inWatchlist ? 'In My List' : 'Add to My List'}
                    </button>
                    {selectedItem.genres && selectedItem.genres.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {selectedItem.genres.map(g => (
                          <span key={g} className="text-xs px-2 py-0.5 bg-gray-700/50 rounded text-gray-300">{g}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 md:p-8 pt-12 sm:pt-14 md:pt-16 max-w-7xl">
              {selectedItem.overview && (
                <p className="text-gray-300 mb-8 max-w-3xl leading-relaxed">{selectedItem.overview}</p>
              )}

              {/* Series Season/Episode selector */}
              {selectedItem.type === 'series' && (
                <div className="mb-8 space-y-4">
                  <div className="flex gap-4 items-center flex-wrap">
                    <label className="text-sm text-gray-400">Season:</label>
                    <select
                      value={selectedSeason}
                      onChange={(e) => changeEpisode(Number(e.target.value), 1)}
                      className="bg-[#1a1a3e] border border-[#2a2a5e] rounded-lg px-4 py-2.5 text-white text-sm"
                    >
                      {seasons.map(s => (
                        <option key={s.season_number} value={s.season_number}>Season {s.season_number}</option>
                      ))}
                    </select>
                    <label className="text-sm text-gray-400 ml-4">Episode:</label>
                    <select
                      value={selectedEpisode}
                      onChange={(e) => changeEpisode(selectedSeason, Number(e.target.value))}
                      className="bg-[#1a1a3e] border border-[#2a2a5e] rounded-lg px-4 py-2.5 text-white text-sm"
                    >
                      {episodes.map((ep: any) => (
                        <option key={ep.episode} value={ep.episode}>
                          E{ep.episode} - {ep.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Streams Section */}
              <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Play size={20} className="text-purple-400" />
                  Streams
                  {selectedItem.type === 'series' && (
                    <span className="text-sm text-gray-400 font-normal">S{selectedSeason}E{selectedEpisode}</span>
                  )}
                </h2>

                {loadingStreams ? (
                  <div className="flex items-center gap-3 text-gray-400 py-8 justify-center">
                    <Loader2 size={24} className="animate-spin" />
                    <span>Searching add-ons for streams...</span>
                  </div>
                ) : streams.length > 0 ? (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {streams.map((stream, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#0b0b1a] hover:bg-[#1a1a3e] transition-colors group cursor-pointer"
                        onClick={() => playStream(stream)}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              stream.isEmbed ? 'bg-emerald-600/20 text-emerald-300' :
                              stream.isTorrent ? 'bg-orange-600/20 text-orange-300' : 
                              'bg-purple-600/20 text-purple-300'
                            }`}>{stream.addonName}</span>
                            {stream.quality && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                stream.quality === '4K' ? 'bg-yellow-600/20 text-yellow-300' :
                                stream.quality === '1080p' ? 'bg-green-600/20 text-green-300' :
                                stream.quality === '720p' ? 'bg-blue-600/20 text-blue-300' :
                                'bg-gray-600/20 text-gray-400'
                              }`}>{stream.quality}</span>
                            )}
                            {stream.size && <span className="text-xs text-gray-500">{stream.size}</span>}
                            {stream.seeders !== undefined && stream.seeders > 0 && (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                {stream.seeders} seeders
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-300 truncate">{stream.description || stream.title || 'Stream'}</p>
                        </div>
                        <button className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 text-white px-4 sm:px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors">
                          <Play size={14} className="fill-white" /> {stream.isTorrent ? 'Stream' : stream.isEmbed ? 'Open' : 'Play'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : streamError ? (
                  <div className="text-center py-8">
                    <AlertCircle size={32} className="mx-auto mb-3 text-orange-400 opacity-75" />
                    <p className="text-gray-400 mb-2">{streamError}</p>
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <button
                        onClick={() => { triedSourcesRef.current.clear(); if (selectedItem) selectItem(selectedItem); }}
                        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        <Play size={14} /> Retry all sources
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Try another movie/series or check your internet connection.</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Info size={32} className="mx-auto mb-3 opacity-50" />
                    <p>No streams found. Try another movie or series.</p>
                    <p className="text-xs text-gray-600 mt-2">Streams are searched from YTS, EZTV, and other public torrent indexes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* HOME VIEW */
          <div className="animate-fadeIn">
            {view === 'home' && (
              <>
                {heroItem && (
                  <div className="relative h-[52vh] sm:h-[60vh] md:h-[70vh] overflow-hidden">
                    {heroItem.poster ? (
                      <img src={heroItem.poster} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900 to-[#0b0b1a]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b1a] via-[#0b0b1a]/70 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b1a] via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-12">
                      <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 max-w-2xl">{heroItem.title}</h1>
                      <div className="flex items-center gap-4 mb-4">
                        {heroItem.rating && (
                          <span className="flex items-center gap-1 text-yellow-500">
                            <Star size={16} className="fill-yellow-500" /> {heroItem.rating.toFixed(1)}
                          </span>
                        )}
                        {heroItem.year && <span className="text-gray-300">{heroItem.year}</span>}
                        <span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-sm uppercase">{heroItem.type}</span>
                      </div>
                      {heroItem.overview && (
                        <p className="text-gray-300 max-w-xl mb-6 line-clamp-3">{heroItem.overview}</p>
                      )}
                      <button
                        onClick={() => selectItem(heroItem)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg font-semibold transition-colors"
                      >
                        <Play size={20} className="fill-white" /> Watch Now
                      </button>
                    </div>
                  </div>
                )}

                <div className="px-4 sm:px-6 md:px-8 pb-8 md:pb-12 space-y-8 md:space-y-10 -mt-8 sm:-mt-12 md:-mt-16 relative z-10">
                  {continueWatching.length > 0 && <ContentRow title="Continue Watching" icon={<Play size={20} className="text-purple-400" />} items={continueWatching} onSelect={selectContinue} />}
                  {trending.length > 0 && <ContentRow title="Trending Now" icon={<Flame size={20} className="text-orange-400" />} items={trending} onSelect={selectItem} />}
                  {nowPlaying.length > 0 && <ContentRow title="Now Playing" icon={<Calendar size={20} className="text-blue-400" />} items={nowPlaying} onSelect={selectItem} />}
                  {popularMovies.length > 0 && <ContentRow title="Popular Movies" icon={<Film size={20} className="text-purple-400" />} items={popularMovies} onSelect={selectItem} />}
                  {popularSeries.length > 0 && <ContentRow title="Popular Series" icon={<Tv size={20} className="text-green-400" />} items={popularSeries} onSelect={selectItem} />}
                  {airingToday.length > 0 && <ContentRow title="Airing Today" icon={<Clock size={20} className="text-yellow-400" />} items={airingToday} onSelect={selectItem} />}
                  {topRated.length > 0 && <ContentRow title="Top Rated" icon={<TrendingUp size={20} className="text-red-400" />} items={topRated} onSelect={selectItem} />}
                </div>
              </>
            )}

            {view === 'movies' && (
              <div className="p-4 sm:p-6 md:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 md:mb-8 flex items-center gap-3">
                  <Film className="text-purple-400" /> Movies
                </h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {loading ? (
                    Array.from({ length: 18 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-lg skeleton" />)
                  ) : (
                    popularMovies.map(item => <MediaCard key={item.id} item={item} onClick={() => selectItem(item)} />)
                  )}
                </div>
              </div>
            )}

            {view === 'series' && (
              <div className="p-4 sm:p-6 md:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 md:mb-8 flex items-center gap-3">
                  <Tv className="text-green-400" /> TV Series
                </h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {loading ? (
                    Array.from({ length: 18 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-lg skeleton" />)
                  ) : (
                    popularSeries.map(item => <MediaCard key={item.id} item={item} onClick={() => selectItem(item)} />)
                  )}
                </div>
              </div>
            )}

            {view === 'search' && (
              <div className="p-4 sm:p-6 md:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 md:mb-8 flex items-center gap-3">
                  <Search className="text-blue-400" /> Search
                </h1>
                <input
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies & series..."
                  className="w-full max-w-xl bg-[#111128] border border-[#2a2a5e] rounded-xl px-5 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-6 md:mb-8"
                />
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {searchResults.map(item => <MediaCard key={item.id} item={item} onClick={() => selectItem(item)} />)}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <p className="text-gray-500 text-center py-12">No results found for "{searchQuery}"</p>
                ) : (
                  <p className="text-gray-500 text-center py-12">Type to search for movies</p>
                )}
              </div>
            )}

            {view === 'addons' && (
              <div className="p-4 sm:p-6 md:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 md:mb-8 flex items-center gap-3">
                  <Settings className="text-purple-400" /> Add-ons Manager
                </h1>
                
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4 text-gray-300">Installed Add-ons</h2>
                  <div className="space-y-3">
                    {addons.map(addon => (
                      <div key={addon.id} className="flex items-center justify-between p-4 bg-[#111128] rounded-xl border border-[#1a1a3e]">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                            addon.enabled ? 'bg-gradient-to-br from-purple-600 to-blue-500' : 'bg-gray-700'
                          }`}>
                            {addon.name[0]}
                          </div>
                          <div>
                            <h3 className="font-medium">{addon.name}</h3>
                            <p className="text-xs text-gray-500">{addon.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded ${addon.enabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}`}>
                            {addon.enabled ? 'Active' : 'Disabled'}
                          </span>
                          <button onClick={() => toggleAddon(addon.id)} className="text-gray-400 hover:text-white">
                            {addon.enabled ? <ToggleRight size={24} className="text-green-400" /> : <ToggleLeft size={24} />}
                          </button>
                          {!DEFAULT_ADDONS.find(d => d.id === addon.id) && (
                            <button onClick={() => removeAddon(addon.id)} className="text-gray-400 hover:text-red-400">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-300">Add Custom Add-on</h2>
                  <div className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm text-gray-400 mb-1 block">Name</label>
                      <input
                        value={customAddonName}
                        onChange={e => setCustomAddonName(e.target.value)}
                        placeholder="My Add-on"
                        className="w-full bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg px-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex-1 min-w-[300px]">
                      <label className="text-sm text-gray-400 mb-1 block">Base URL (without /manifest.json)</label>
                      <input
                        value={customAddonUrl}
                        onChange={e => setCustomAddonUrl(e.target.value)}
                        placeholder="https://torrentio.strem.fun/YOUR_CONFIG"
                        className="w-full bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg px-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      onClick={addCustomAddon}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>

                <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-300">Quick Setup Guide</h2>
                  <div className="space-y-3 text-sm text-gray-400">
                    <p>To get real streams working, configure an add-on with your preferences:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <a href="https://torrentio.strem.fun/configure" target="_blank" rel="noopener" className="block p-3 bg-[#0b0b1a] rounded-lg hover:bg-[#1a1a3e] transition-colors border border-[#2a2a5e]">
                        <p className="text-purple-400 font-medium">Torrentio</p>
                        <p className="text-xs mt-1">Configure torrent providers + optional Real-Debrid</p>
                      </a>
                      <a href="https://comet.elfhosted.com/configure" target="_blank" rel="noopener" className="block p-3 bg-[#0b0b1a] rounded-lg hover:bg-[#1a1a3e] transition-colors border border-[#2a2a5e]">
                        <p className="text-purple-400 font-medium">Comet</p>
                        <p className="text-xs mt-1">Fast torrent + debrid streaming</p>
                      </a>
                      <a href="https://mediafusion.elfhosted.com/configure" target="_blank" rel="noopener" className="block p-3 bg-[#0b0b1a] rounded-lg hover:bg-[#1a1a3e] transition-colors border border-[#2a2a5e]">
                        <p className="text-purple-400 font-medium">MediaFusion</p>
                        <p className="text-xs mt-1">Multi-language + live TV support</p>
                      </a>
                      <a href="https://aiostreams.elfhosted.com/configure" target="_blank" rel="noopener" className="block p-3 bg-[#0b0b1a] rounded-lg hover:bg-[#1a1a3e] transition-colors border border-[#2a2a5e]">
                        <p className="text-purple-400 font-medium">AIOStreams</p>
                        <p className="text-xs mt-1">Combine multiple addons into one</p>
                      </a>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                    Torrentio, Comet, MediaFusion and AIOStreams are preconfigured and return
                    torrent streams that play in LunaStream's own player (no ads). After
                    configuring a new add-on elsewhere, copy the manifest URL and add it here.
                  </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ===== SUB-COMPONENTS =====
function ContentRow({ title, icon, items, onSelect }: { title: string; icon: React.ReactNode; items: MediaItem[]; onSelect: (item: MediaItem) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="relative group/row">
        <button onClick={() => scroll('left')} className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0b0b1a] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
          <ChevronLeft size={28} />
        </button>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto row-scroll pb-2">
          {items.map(item => (
            <div key={item.id} className="flex-shrink-0 w-32 sm:w-36 md:w-[160px]">
              <MediaCard item={item} onClick={() => onSelect(item)} />
            </div>
          ))}
        </div>
        <button onClick={() => scroll('right')} className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0b0b1a] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}

function MediaCard({ item, onClick }: { item: MediaItem; onClick: () => void }) {
  return (
    <div onClick={onClick} className="card-hover cursor-pointer group">
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#1a1a3e] relative">
        {item.poster ? (
          <img src={item.poster} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm p-4 text-center">
            {item.title}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {item.rating && (
                <span className="flex items-center gap-1 text-yellow-500 text-xs">
                  <Star size={10} className="fill-yellow-500" /> {item.rating.toFixed(1)}
                </span>
              )}
              {item.year && <span className="text-xs text-gray-400">{item.year}</span>}
            </div>
            <div className="flex items-center gap-1 text-purple-400 text-xs font-medium">
              <Play size={10} className="fill-purple-400" /> Watch
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-300 truncate group-hover:text-white transition-colors">{item.title}</p>
    </div>
  );
}
