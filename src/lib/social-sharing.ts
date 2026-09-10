/**
 * Social sharing utilities
 */

export interface ShareData {
  title: string;
  text?: string;
  url: string;
}

/**
 * Share using native Web Share API (mobile browsers)
 */
export async function nativeShare(data: ShareData): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: data.title,
      text: data.text,
      url: data.url
    });
    return true;
  } catch (error) {
    console.error('Share failed:', error);
    return false;
  }
}

/**
 * Share on Twitter/X
 */
export function shareOnTwitter(data: ShareData): void {
  const text = encodeURIComponent(data.text || data.title);
  const url = encodeURIComponent(data.url);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

/**
 * Share on Facebook
 */
export function shareOnFacebook(data: ShareData): void {
  const url = encodeURIComponent(data.url);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

/**
 * Share on Reddit
 */
export function shareOnReddit(data: ShareData): void {
  const title = encodeURIComponent(data.title);
  const url = encodeURIComponent(data.url);
  window.open(`https://reddit.com/submit?url=${url}&title=${title}`, '_blank');
}

/**
 * Share via Email
 */
export function shareViaEmail(data: ShareData): void {
  const subject = encodeURIComponent(data.title);
  const body = encodeURIComponent(`${data.text || data.title}\n\n${data.url}`);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

/**
 * Copy link to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Copy failed:', error);
    return false;
  }
}

/**
 * Generate share URL for a movie/series
 */
export function generateShareUrl(imdbId: string, type: 'movie' | 'series'): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lunastream.app';
  return `${baseUrl}/watch/${type}/${imdbId}`;
}

/**
 * Generate share text
 */
export function generateShareText(title: string, type: 'movie' | 'series'): string {
  const typeText = type === 'movie' ? 'movie' : 'TV series';
  return `Watch ${title} on LunaStream - Free streaming for ${typeText}`;
}
