'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Trash2, Film, Loader2 } from 'lucide-react';

interface WatchlistItem {
  id: string;
  tmdbId: number;
  imdbId: string;
  type: string;
  title: string;
  poster: string;
  backdrop?: string;
  year?: string;
  rating?: number;
  addedAt: string;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      // Client-side watchlist from localStorage
      // Works without an account - falls back to the local profile
      const userId = localStorage.getItem('authToken') || 'local';
      
      const key = `watchlist_${userId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      setWatchlist(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async (imdbId: string) => {
    try {
      const userId = localStorage.getItem('authToken') || 'local';
      
      const key = `watchlist_${userId}`;
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = items.filter((item: any) => item.imdbId !== imdbId);
      localStorage.setItem(key, JSON.stringify(filtered));
      setWatchlist(filtered);
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0b1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/login" className="text-purple-400 hover:text-purple-300">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b1a] p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">My Watchlist</h1>
      </div>

      {watchlist.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Your watchlist is empty</p>
          <p className="text-gray-500 text-sm mb-6">
            Add movies and series to your watchlist to keep track of what you want to watch
          </p>
          <Link href="/" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-colors">
            <Play className="w-5 h-5" />
            Browse Content
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {watchlist.map(item => (
            <div key={item.id} className="relative group">
              <Link href={`/?open=${item.imdbId}`}>
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#1a1a3e]">
                  {item.poster ? (
                    <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm p-4 text-center">
                      {item.title}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-300 truncate">{item.title}</p>
              </Link>
              <button
                onClick={() => removeFromWatchlist(item.imdbId)}
                aria-label={`Remove ${item.title}`}
                className="absolute top-2 right-2 bg-red-600/90 text-white p-2.5 rounded-lg hover:bg-red-600 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
