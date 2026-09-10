// Stremio Addon Protocol Types

export interface StremioManifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  logo?: string;
  background?: string;
  types: string[];
  resources: (string | { name: string; types: string[]; idPrefixes?: string[] })[];
  catalogs?: { type: string; id: string; name?: string }[];
  behaviorHints?: {
    adult?: boolean;
    configurable?: boolean;
    configurationRequired?: boolean;
  };
}

export interface StremioMeta {
  id: string;
  type: string;
  name: string;
  poster?: string;
  posterShape?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  year?: string;
  imdbRating?: string;
  runtime?: string;
  genres?: string[];
  links?: { name: string; category: string; url: string }[];
  videos?: StremioVideo[];
}

export interface StremioVideo {
  id: string;
  title: string;
  released: string;
  overview?: string;
  thumbnail?: string;
  season?: number;
  episode?: number;
}

export interface StremioStream {
  name?: string;
  description?: string;
  url?: string;
  externalUrl?: string;
  ytId?: string;
  infoHash?: string;
  fileIdx?: number;
  title?: string;
  subtitles?: { url: string; lang: string }[];
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
    videoSize?: number;
  };
}

export interface StremioCatalogResponse {
  metas: StremioMeta[];
}

export interface StremioStreamResponse {
  streams: StremioStream[];
}

// Addon Configuration
export interface AddonConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  manifest?: StremioManifest;
  types: string[];
}

// TMDB Types
export interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
  media_type?: string;
}

export interface TMDBResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

// App Types
export interface MediaItem {
  id: string;
  type: 'movie' | 'series';
  title: string;
  poster?: string;
  backdrop?: string;
  overview?: string;
  year?: string;
  rating?: number;
  genres?: string[];
  runtime?: string;
  videos?: StremioVideo[];
}

export type ViewMode = 'home' | 'movies' | 'series' | 'search' | 'addons' | 'detail' | 'player';

// Subtitle Types
export interface Subtitle {
  id: string;
  label: string;
  language: string;
  url: string;
}
