import { AddonConfig } from './types';

// Default community addons that provide real streams
export const DEFAULT_ADDONS: AddonConfig[] = [
  {
    id: 'torrentio',
    name: 'Torrentio',
    url: 'https://torrentio.strem.fun/manifest.json',
    enabled: true,
    types: ['movie', 'series'],
  },
  {
    id: 'comet',
    name: 'Comet',
    url: 'https://comet.elfhosted.com/manifest.json',
    enabled: true,
    types: ['movie', 'series'],
  },
  {
    id: 'mediafusion',
    name: 'MediaFusion',
    url: 'https://mediafusion.elfhosted.com/manifest.json',
    enabled: true,
    types: ['movie', 'series', 'anime'],
  },
  {
    id: 'aiostreams',
    name: 'AIOStreams',
    url: 'https://aiostreams.elfhosted.com/manifest.json',
    enabled: true,
    types: ['movie', 'series'],
  },
  {
    id: 'anime-kitsu',
    name: 'Anime Kitsu',
    url: 'https://anime-kitsu.strem.fun/manifest.json',
    enabled: false,
    types: ['anime'],
  },
  {
    id: 'opensubtitles',
    name: 'Open Subtitles',
    url: 'https://opensubtitles.strem.io/manifest.json',
    enabled: true,
    types: ['movie', 'series'],
  },
];

export function getEnabledAddons(): AddonConfig[] {
  if (typeof window === 'undefined') return DEFAULT_ADDONS.filter((a) => a.enabled);
  
  const stored = localStorage.getItem('lunastream_addons');
  if (stored) {
    try {
      const addons: AddonConfig[] = JSON.parse(stored);
      return addons.filter((a) => a.enabled);
    } catch {
      return DEFAULT_ADDONS.filter((a) => a.enabled);
    }
  }
  return DEFAULT_ADDONS.filter((a) => a.enabled);
}

export function getAllAddons(): AddonConfig[] {
  if (typeof window === 'undefined') return DEFAULT_ADDONS;
  
  const stored = localStorage.getItem('lunastream_addons');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_ADDONS;
    }
  }
  return DEFAULT_ADDONS;
}

export function saveAddons(addons: AddonConfig[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lunastream_addons', JSON.stringify(addons));
}

export function toggleAddon(addonId: string): AddonConfig[] {
  const addons = getAllAddons();
  const updated = addons.map((a) => (a.id === addonId ? { ...a, enabled: !a.enabled } : a));
  saveAddons(updated);
  return updated;
}

export function addCustomAddon(name: string, url: string): AddonConfig[] {
  const addons = getAllAddons();
  const id = `custom_${Date.now()}`;
  const newAddon: AddonConfig = {
    id,
    name,
    url,
    enabled: true,
    types: ['movie', 'series'],
  };
  const updated = [...addons, newAddon];
  saveAddons(updated);
  return updated;
}

export function removeAddon(addonId: string): AddonConfig[] {
  const addons = getAllAddons().filter((a) => a.id !== addonId);
  saveAddons(addons);
  return addons;
}
