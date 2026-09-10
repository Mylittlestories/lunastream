'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, Bookmark, History, Settings } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

export default function UserMenu() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setShowDropdown(false);
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Link
          href="/login"
          className="text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-[#1a1a3e] transition-colors text-sm"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-[#1a1a3e] transition-colors"
      >
        <User size={20} />
        <span className="text-sm">{user.name || user.email}</span>
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-[#111128] border border-[#1a1a3e] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-[#1a1a3e]">
              <p className="text-white font-medium truncate">{user.name || 'User'}</p>
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
            </div>
            <div className="py-2">
              <Link
                href="/watchlist"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-[#1a1a3e] hover:text-white transition-colors"
              >
                <Bookmark size={18} />
                <span>My Watchlist</span>
              </Link>
              <Link
                href="/history"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-[#1a1a3e] hover:text-white transition-colors"
              >
                <History size={18} />
                <span>Watch History</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-[#1a1a3e] hover:text-white transition-colors"
              >
                <Settings size={18} />
                <span>Settings</span>
              </Link>
            </div>
            <div className="border-t border-[#1a1a3e] py-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-[#1a1a3e] hover:text-red-300 transition-colors w-full text-left"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
