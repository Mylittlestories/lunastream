import { StremioManifest, StremioStreamResponse, StremioCatalogResponse, StremioMeta } from './types';

const PROXY_BASE = '/api/stremio';

export class StremioClient {
  private addonUrl: string;

  constructor(addonUrl: string) {
    this.addonUrl = addonUrl.replace(/\/manifest\.json$/, '').replace(/\/$/, '');
  }

  async getManifest(): Promise<StremioManifest> {
    try {
      const response = await fetch(`${PROXY_BASE}?url=${encodeURIComponent(this.addonUrl + '/manifest.json')}`);
      if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching manifest:', error);
      throw error;
    }
  }

  async getCatalog(type: string, id: string, extra?: Record<string, any>): Promise<StremioMeta[]> {
    try {
      let url = `${this.addonUrl}/catalog/${type}/${id}`;
      if (extra && Object.keys(extra).length > 0) {
        const queryString = Object.entries(extra)
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
        url += `/${queryString}`;
      }
      url += '.json';

      const response = await fetch(`${PROXY_BASE}?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`Failed to fetch catalog: ${response.status}`);
      const data: StremioCatalogResponse = await response.json();
      return data.metas || [];
    } catch (error) {
      console.error('Error fetching catalog:', error);
      return [];
    }
  }

  async getStreams(type: string, id: string): Promise<StremioStreamResponse> {
    try {
      const url = `${this.addonUrl}/stream/${type}/${id}.json`;
      const response = await fetch(`${PROXY_BASE}?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`Failed to fetch streams: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching streams:', error);
      return { streams: [] };
    }
  }

  async getMeta(type: string, id: string): Promise<StremioMeta | null> {
    try {
      const url = `${this.addonUrl}/meta/${type}/${id}.json`;
      const response = await fetch(`${PROXY_BASE}?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`Failed to fetch meta: ${response.status}`);
      const data = await response.json();
      return data.meta || null;
    } catch (error) {
      console.error('Error fetching meta:', error);
      return null;
    }
  }

  async search(type: string, query: string, catalogId?: string): Promise<StremioMeta[]> {
    const id = catalogId || this.getDefaultCatalogId(type);
    return this.getCatalog(type, id, { search: query });
  }

  private getDefaultCatalogId(type: string): string {
    if (this.addonUrl.includes('torrentio')) return 'top';
    if (this.addonUrl.includes('mediafusion')) return 'top';
    if (this.addonUrl.includes('comet')) return 'top';
    return 'top';
  }
}

export function createStremioClient(addonUrl: string): StremioClient {
  return new StremioClient(addonUrl);
}
