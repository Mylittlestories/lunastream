import { Subtitle } from './types';

/**
 * Fetch subtitles from multiple sources
 */
export async function fetchSubtitles(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<Subtitle[]> {
  const subtitles: Subtitle[] = [];

  // Try OpenSubtitles first (most comprehensive)
  try {
    const openSubs = await fetchOpenSubtitles(imdbId, type, season, episode);
    subtitles.push(...openSubs);
  } catch (error) {
    console.error('OpenSubtitles fetch failed:', error);
  }

  // Fallback: Try Subdl
  if (subtitles.length === 0) {
    try {
      const subdl = await fetchSubdl(imdbId, type, season, episode);
      subtitles.push(...subdl);
    } catch (error) {
      console.error('Subdl fetch failed:', error);
    }
  }

  return subtitles;
}

/**
 * Fetch from OpenSubtitles REST API
 */
async function fetchOpenSubtitles(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<Subtitle[]> {
  // OpenSubtitles API v2 (free tier)
  const params = new URLSearchParams({
    imdb_id: imdbId,
    type: type === 'movie' ? 'movie' : 'episode',
  });

  if (season !== undefined) params.set('season_number', season.toString());
  if (episode !== undefined) params.set('episode_number', episode.toString());

  const response = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${params}`, {
    headers: {
      'Api-Key': process.env.OPENSUBTITLES_API_KEY || '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`OpenSubtitles API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.data || []).map((sub: any, index: number) => ({
    id: `opensubtitles-${index}`,
    label: sub.attributes.language === 'en' ? 'English' : sub.attributes.language_name || sub.attributes.language,
    language: sub.attributes.language,
    url: sub.attributes.files[0]?.link || '',
  })).filter((sub: Subtitle) => sub.url);
}

/**
 * Fetch from Subdl (backup subtitle source)
 */
async function fetchSubdl(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<Subtitle[]> {
  const params = new URLSearchParams({
    imdb_id: imdbId,
  });

  if (season !== undefined) params.set('season', season.toString());
  if (episode !== undefined) params.set('episode', episode.toString());

  const response = await fetch(`https://api.subdl.com/api/v1/subtitles?${params}`);

  if (!response.ok) {
    throw new Error(`Subdl API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.subtitles || []).map((sub: any, index: number) => ({
    id: `subdl-${index}`,
    label: sub.language === 'en' ? 'English' : sub.language,
    language: sub.language || 'en',
    url: sub.url || '',
  })).filter((sub: Subtitle) => sub.url);
}

/**
 * Convert SRT format to VTT format
 */
export function convertSrtToVtt(srt: string): string {
  let vtt = 'WEBVTT\n\n';
  
  // Replace commas with periods in timestamps
  srt = srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  // Remove sequence numbers and extra newlines
  const blocks = srt.split(/\n\n+/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 2) {
      // Skip sequence number if present
      const startIndex = /^\d+$/.test(lines[0]) ? 1 : 0;
      vtt += lines.slice(startIndex).join('\n') + '\n\n';
    }
  }
  
  return vtt;
}

/**
 * Create a blob URL for subtitle content
 */
export function createSubtitleBlobUrl(content: string, format: 'vtt' | 'srt' = 'vtt'): string {
  let vttContent = content;
  
  if (format === 'srt') {
    vttContent = convertSrtToVtt(content);
  }
  
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  return URL.createObjectURL(blob);
}
