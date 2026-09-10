import { NextRequest, NextResponse } from 'next/server';

// Torrent tracker APIs for better stream discovery
const TORRENT_APIS = {
  tpba: 'https://apibay.org', // The Pirate Bay API
  // Add more trackers as needed
};

interface TorrentResult {
  name: string;
  info_hash: string;
  seeders: string;
  leechers: string;
  size: string;
  username: string;
  category: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imdbId = searchParams.get('imdb_id');
  const type = searchParams.get('type');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!imdbId || !type) {
    return NextResponse.json({ streams: [] });
  }

  try {
    const streams = await searchTorrents(imdbId, type, season, episode);
    return NextResponse.json({ streams });
  } catch (error) {
    console.error('Stream search error:', error);
    return NextResponse.json({ streams: [] });
  }
}

async function searchTorrents(
  imdbId: string,
  type: string,
  season?: string,
  episode?: string
): Promise<any[]> {
  const streams: any[] = [];

  // Search The Pirate Bay
  try {
    const tpbaResults = await searchTPB(imdbId, type, season, episode);
    streams.push(...tpbaResults);
  } catch (error) {
    console.error('TPB search failed:', error);
  }

  // Sort by seeders (most seeders first)
  streams.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));

  return streams;
}

async function searchTPB(
  imdbId: string,
  type: string,
  season?: string,
  episode?: string
): Promise<any[]> {
  let query = imdbId;
  if (type === 'series' && season && episode) {
    query = `${imdbId} S${season.padStart(2, '0')}E${episode.padStart(2, '0')}`;
  }

  const category = type === 'movie' ? '207' : '208'; // 207=HD Movies, 208=HD TV

  const url = `${TORRENT_APIS.tpba}/q.php?q=${encodeURIComponent(query)}&cat=${category}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`TPB API error: ${response.status}`);
  }

  const results: TorrentResult[] = await response.json();

  return results
    .filter(r => r.info_hash && parseInt(r.seeders) > 0)
    .slice(0, 20) // Top 20 results
    .map(r => ({
      name: r.name,
      description: r.name,
      title: r.name,
      addonName: '🏴‍☠️ TPB',
      addonId: 'tpb',
      quality: extractQuality(r.name),
      size: formatSize(parseInt(r.size)),
      infoHash: r.info_hash,
      seeders: parseInt(r.seeders),
      url: `magnet:?xt=urn:btih:${r.info_hash}&dn=${encodeURIComponent(r.name)}`,
      isTorrent: true,
      isEmbed: false,
    }));
}

function extractQuality(filename: string): string {
  if (filename.match(/2160p|4K|UHD/i)) return '4K';
  if (filename.match(/1080p/i)) return '1080p';
  if (filename.match(/720p/i)) return '720p';
  if (filename.match(/480p/i)) return '480p';
  return '';
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
