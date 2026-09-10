import { StremioStream, StremioStreamResponse, AddonConfig } from './types';
import { createStremioClient } from './stremio-client';

// Real addon URLs that provide actual streams
const STREAM_ADDONS = {
  torrentio: 'https://torrentio.strem.fun',
  comet: 'https://comet.elfhosted.com',
  mediafusion: 'https://mediafusion.elfhosted.com',
  aiostreams: 'https://aiostreams.elfhosted.com',
};

interface StreamResult {
  streams: ResolvedStream[];
  addon: string;
}

export interface ResolvedStream {
  url?: string;
  externalUrl?: string;
  name?: string;
  description?: string;
  title?: string;
  infoHash?: string;
  addonName: string;
  addonId: string;
  quality?: string;
  size?: string;
}

export async function fetchStreamsFromAddon(
  addon: AddonConfig,
  type: string,
  id: string
): Promise<StreamResult> {
  try {
    const client = createStremioClient(addon.url);
    const response = await client.getStreams(type, id);
    return {
      streams: (response.streams || []).map((s) => mapStream(s, addon)),
      addon: addon.name,
    };
  } catch (error) {
    console.error(`Error fetching from ${addon.name}:`, error);
    return { streams: [], addon: addon.name };
  }
}

function mapStream(stream: StremioStream, addon: AddonConfig): ResolvedStream {
  const title = stream.description || stream.title || '';
  let quality = '';
  let size = '';
  
  // Extract quality from title
  if (title.match(/2160|4K|UHD/i)) quality = '4K';
  else if (title.match(/1080/i)) quality = '1080p';
  else if (title.match(/720/i)) quality = '720p';
  else if (title.match(/480/i)) quality = '480p';
  else quality = 'Unknown';

  // Extract size
  const sizeMatch = title.match(/(\d+\.?\d*)\s*(GB|MB)/i);
  if (sizeMatch) size = `${sizeMatch[1]} ${sizeMatch[2]}`;

  return {
    url: stream.url,
    externalUrl: stream.externalUrl,
    name: stream.name || addon.name,
    description: stream.description,
    title: stream.description || stream.title,
    infoHash: stream.infoHash,
    addonName: addon.name,
    addonId: addon.id,
    quality,
    size,
  };
}

export async function resolveStreams(
  addons: AddonConfig[],
  type: 'movie' | 'series',
  imdbId: string,
  season?: number,
  episode?: number
): Promise<ResolvedStream[]> {
  const allStreams: ResolvedStream[] = [];
  
  // Format the ID based on type
  let queryId: string;
  if (type === 'series' && season !== undefined && episode !== undefined) {
    queryId = `${imdbId}:${season}:${episode}`;
  } else {
    queryId = imdbId;
  }

  // Query all enabled addons in parallel
  const results = await Promise.allSettled(
    addons
      .filter((a) => a.enabled)
      .map((addon) => fetchStreamsFromAddon(addon, type, queryId))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allStreams.push(...result.value.streams);
    }
  }

  // Sort by quality (4K > 1080p > 720p > 480p)
  const qualityOrder: Record<string, number> = { '4K': 0, '1080p': 1, '720p': 2, '480p': 3, Unknown: 4 };
  allStreams.sort((a, b) => {
    const qa = qualityOrder[a.quality || 'Unknown'] ?? 4;
    const qb = qualityOrder[b.quality || 'Unknown'] ?? 4;
    return qa - qb;
  });

  return allStreams;
}

export function getPlayableUrl(stream: ResolvedStream): string | null {
  if (stream.url) return stream.url;
  if (stream.externalUrl) return stream.externalUrl;
  if (stream.infoHash) {
    // Use a webtorrent fallback
    return `https://webtorrent.io/torrents/${stream.infoHash}`;
  }
  return null;
}

// Direct Torrentio integration - most reliable stream source
export async function getTorrentioStreams(
  type: 'movie' | 'series',
  imdbId: string,
  season?: number,
  episode?: number
): Promise<ResolvedStream[]> {
  let queryId: string;
  if (type === 'series' && season !== undefined && episode !== undefined) {
    queryId = `${imdbId}:${season}:${episode}`;
  } else {
    queryId = imdbId;
  }

  const addon: AddonConfig = {
    id: 'torrentio',
    name: 'Torrentio',
    url: 'https://torrentio.strem.fun/manifest.json',
    enabled: true,
    types: ['movie', 'series'],
  };

  const result = await fetchStreamsFromAddon(addon, type, queryId);
  return result.streams;
}
