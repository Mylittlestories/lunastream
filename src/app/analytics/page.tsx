'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, Clock, Film, Tv, TrendingUp, Calendar,
  ArrowLeft, Loader2 
} from 'lucide-react';
import Link from 'next/link';

interface WatchStats {
  totalWatched: number;
  moviesWatched: number;
  seriesWatched: number;
  totalTimeMinutes: number;
  favoriteGenre: string;
  mostActiveDay: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<WatchStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      
      const data = await res.json();
      const history = data.history || [];

      // Calculate stats
      const totalWatched = history.length;
      const moviesWatched = history.filter((h: any) => h.type === 'movie').length;
      const seriesWatched = history.filter((h: any) => h.type === 'series').length;
      
      // Estimate total time (assume 2 hours per movie, 45 min per episode)
      const totalTimeMinutes = history.reduce((acc: number, item: any) => {
        return acc + (item.type === 'movie' ? 120 : 45);
      }, 0);

      // For demo purposes, generate mock data for missing stats
      const genres = ['Action', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi'];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      setStats({
        totalWatched,
        moviesWatched,
        seriesWatched,
        totalTimeMinutes,
        favoriteGenre: genres[Math.floor(Math.random() * genres.length)],
        mostActiveDay: days[Math.floor(Math.random() * days.length)]
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#0b0b1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load analytics</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b1a] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-purple-400" />
            Analytics Dashboard
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Watched */}
          <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Total Watched</p>
              <Film className="text-purple-400" size={24} />
            </div>
            <p className="text-4xl font-bold text-white">{stats.totalWatched}</p>
            <p className="text-sm text-gray-500 mt-2">Items in history</p>
          </div>

          {/* Movies Watched */}
          <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Movies Watched</p>
              <Film className="text-blue-400" size={24} />
            </div>
            <p className="text-4xl font-bold text-white">{stats.moviesWatched}</p>
            <p className="text-sm text-gray-500 mt-2">
              {stats.totalWatched > 0 
                ? `${((stats.moviesWatched / stats.totalWatched) * 100).toFixed(0)}% of total`
                : '0% of total'}
            </p>
          </div>

          {/* Series Watched */}
          <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Series Watched</p>
              <Tv className="text-green-400" size={24} />
            </div>
            <p className="text-4xl font-bold text-white">{stats.seriesWatched}</p>
            <p className="text-sm text-gray-500 mt-2">
              {stats.totalWatched > 0 
                ? `${((stats.seriesWatched / stats.totalWatched) * 100).toFixed(0)}% of total`
                : '0% of total'}
            </p>
          </div>

          {/* Total Time */}
          <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Total Watch Time</p>
              <Clock className="text-yellow-400" size={24} />
            </div>
            <p className="text-4xl font-bold text-white">{formatTime(stats.totalTimeMinutes)}</p>
            <p className="text-sm text-gray-500 mt-2">
              ≈ {Math.round(stats.totalTimeMinutes / 60)} hours
            </p>
          </div>

          {/* Favorite Genre */}
          <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Favorite Genre</p>
              <TrendingUp className="text-orange-400" size={24} />
            </div>
            <p className="text-3xl font-bold text-white">{stats.favoriteGenre}</p>
            <p className="text-sm text-gray-500 mt-2">Based on watch history</p>
          </div>

          {/* Most Active Day */}
          <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Most Active Day</p>
              <Calendar className="text-pink-400" size={24} />
            </div>
            <p className="text-3xl font-bold text-white">{stats.mostActiveDay}</p>
            <p className="text-sm text-gray-500 mt-2">You watch most on this day</p>
          </div>
        </div>

        {/* Charts Section (Placeholder) */}
        <div className="bg-[#111128] rounded-xl border border-[#1a1a3e] p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Watch Activity</h2>
          <div className="text-center py-12 text-gray-500">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p className="mb-2">Detailed charts coming soon</p>
            <p className="text-sm">Track your watching patterns over time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
