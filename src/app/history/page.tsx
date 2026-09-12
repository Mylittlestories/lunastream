'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Clock, Loader2 } from 'lucide-react';

interface HistoryItem {
  id: string;
  tmdbId: number;
  imdbId: string;
  type: string;
  title: string;
  poster: string;
  year?: string;
  season?: number;
  episode?: number;
  progress: number;
  lastWatchedAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // Client-side history from localStorage
      // Works without an account - falls back to the local profile
      const userId = localStorage.getItem('authToken') || 'local';
      
      const key = `history_${userId}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      setHistory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Watch History</h1>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No watch history yet</p>
          <p className="text-gray-500 text-sm mb-6">
            Start watching movies and series to build your history
          </p>
          <Link href="/" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-colors">
            <Play className="w-5 h-5" />
            Browse Content
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(item => (
            <div key={item.id} className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-4 p-3 sm:p-4 bg-[#111128] rounded-xl border border-[#1a1a3e] hover:bg-[#1a1a3e] transition-colors">
              <Link href={`/?open=${item.imdbId}${item.season && item.episode ? `&s=${item.season}&e=${item.episode}` : ''}`}>
                <div className="w-20 h-28 rounded-lg overflow-hidden bg-[#1a1a3e] flex-shrink-0">
                  {item.poster ? (
                    <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs p-2 text-center">
                      {item.title}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/?open=${item.imdbId}${item.season && item.episode ? `&s=${item.season}&e=${item.episode}` : ''}`}>
                  <h3 className="text-lg font-semibold text-white truncate hover:text-purple-400 transition-colors">
                    {item.title}
                  </h3>
                </Link>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                  <span className="capitalize">{item.type}</span>
                  {item.year && <span>• {item.year}</span>}
                  {item.season && item.episode && (
                    <span>• S{item.season}E{item.episode}</span>
                  )}
                </div>
                {item.progress > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-[#0b0b1a] rounded-full h-1.5">
                      <div 
                        className="bg-purple-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.progress.toFixed(0)}% watched</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>Watched {formatDate(item.lastWatchedAt)}</span>
                </div>
              </div>
              <Link 
                href={`/watch/${item.imdbId}`}
                className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors self-center"
              >
                <Play size={14} /> Resume
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
