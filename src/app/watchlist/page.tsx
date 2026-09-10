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
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load watchlist');
      }
      
      setWatchlist(data.watchlist || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async (imdbId: string) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imdbId })
      });

      if (!res.ok) {
        throw new Error('Failed to remove');
      }

      setWatchlist(watchlist.filter(item => item.imdbId !== imdbId));
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
    <div className="min-h-screen bg-[#0b0b1a] p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold text-white">My Watchlist</h1>
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
              <Link href={`/watch/${item.imdbId}`}>
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
                className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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
