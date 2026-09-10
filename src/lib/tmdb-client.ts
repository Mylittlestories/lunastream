import { TMDBResponse, TMDBMovie, MediaItem } from './types';

const TMDB_API_KEY = '65c06c4a5d4ff2a4e6e398738b93f63f';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const TMDB_IMAGE_SIZES = {
  poster: { small: 'w342', medium: 'w500', large: 'w780', original: 'original' },
  backdrop: { small: 'w780', medium: 'w1280', large: 'w1920', original: 'original' },
};

export function getPosterUrl(path: string | null, size: 'small' | 'medium' | 'large' | 'original' = 'medium'): string {
  if (!path) return '/placeholder-poster.svg';
  return `${IMAGE_BASE}/${TMDB_IMAGE_SIZES.poster[size]}${path}`;
}

export function getBackdropUrl(path: string | null, size: 'small' | 'medium' | 'large' | 'original' = 'medium'): string {
  if (!path) return '/placeholder-backdrop.svg';
  return `${IMAGE_BASE}/${TMDB_IMAGE_SIZES.backdrop[size]}${path}`;
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  try {
    const searchParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'en-US',
      ...params,
    });
    const response = await fetch(`${TMDB_BASE}${endpoint}?${searchParams}`);
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('TMDB fetch error:', error);
    return null;
  }
}

function mapTMDBToMediaItem(movie: TMDBMovie, type: 'movie' | 'series'): MediaItem {
  const title = type === 'movie' ? movie.title || movie.original_title || '' : movie.name || movie.original_name || '';
  const date = type === 'movie' ? movie.release_date : movie.first_air_date;
  const year = date ? new Date(date).getFullYear().toString() : '';

  return {
    id: `tt_movie_${movie.id}`,
    type,
    title,
    poster: movie.poster_path ? getPosterUrl(movie.poster_path, 'medium') : undefined,
    backdrop: movie.backdrop_path ? getBackdropUrl(movie.backdrop_path, 'medium') : undefined,
    overview: movie.overview,
    year,
    rating: movie.vote_average,
  };
}

export async function getTrendingMovies(page: number = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/trending/movie/week', { page: page.toString() });
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'movie'));
}

export async function getTrendingSeries(page: number = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/trending/tv/week', { page: page.toString() });
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'series'));
}

export async function getPopularMovies(page: number = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/movie/popular', { page: page.toString() });
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'movie'));
}

export async function getPopularSeries(page: number = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/tv/popular', { page: page.toString() });
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'series'));
}

export async function getTopRatedMovies(page: number = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/movie/top_rated', { page: page.toString() });
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'movie'));
}

export async function getTopRatedSeries(page: number = 1): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/tv/top_rated', { page: page.toString() });
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'series'));
}

export async function getNowPlayingMovies(): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/movie/now_playing');
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'movie'));
}

export async function getUpcomingMovies(): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/movie/upcoming');
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'movie'));
}

export async function getAiringTodaySeries(): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBResponse>('/tv/airing_today');
  if (!data) return [];
  return data.results.map((m) => mapTMDBToMediaItem(m, 'series'));
}

export async function searchMulti(query: string, page: number = 1): Promise<{ movies: MediaItem[]; series: MediaItem[] }> {
  const data = await tmdbFetch<TMDBResponse & { results: (TMDBMovie & { media_type: string })[] }>('/search/multi', {
    query,
    page: page.toString(),
  });
  if (!data) return { movies: [], series: [] };

  const movies: MediaItem[] = [];
  const series: MediaItem[] = [];

  for (const item of data.results) {
    if (item.media_type === 'movie') {
      movies.push(mapTMDBToMediaItem(item, 'movie'));
    } else if (item.media_type === 'tv') {
      series.push(mapTMDBToMediaItem(item, 'series'));
    }
  }

  return { movies, series };
}

export async function getMovieDetails(tmdbId: string): Promise<{ movie: any; imdbId: string } | null> {
  const data = await tmdbFetch<any>(`/movie/${tmdbId}`, { append_to_response: 'credits,recommendations,similar' });
  if (!data) return null;
  const imdbId = data.imdb_id || '';
  return { movie: data, imdbId };
}

export async function getSeriesDetails(tmdbId: string): Promise<{ series: any; imdbId: string } | null> {
  const data = await tmdbFetch<any>(`/tv/${tmdbId}`, { append_to_response: 'credits,recommendations,similar' });
  if (!data) return null;
  const imdbId = data.external_ids?.imdb_id || '';
  return { series: data, imdbId };
}

export function extractTMDBId(stremioId: string): string {
  // Handle various ID formats: tt_movie_123, tt1234567, etc.
  const match = stremioId.match(/(?:tt_movie_)?(\d+)/);
  return match ? match[1] : stremioId;
}

export function getIMDbIdFromTMDB(tmdbId: string, type: 'movie' | 'series'): string {
  // We'll use the TMDB ID with a special format that our addon can understand
  return `tmdb_${type}_${tmdbId}`;
}
