import { useState } from 'react';
import { Filter, X } from 'lucide-react';

interface AdvancedFiltersProps {
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}

export interface FilterState {
  genres: string[];
  yearRange: [number, number];
  minRating: number;
  sortBy: 'popularity' | 'rating' | 'release_date' | 'title';
  sortOrder: 'asc' | 'desc';
}

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
  'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
  'TV Movie', 'Thriller', 'War', 'Western'
];

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Rating' },
  { value: 'release_date', label: 'Release Date' },
  { value: 'title', label: 'Title' }
];

export default function AdvancedFilters({ onApply, onClose }: AdvancedFiltersProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<FilterState['sortBy']>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleGenre = (genre: string) => {
    setGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleApply = () => {
    onApply({ genres, yearRange, minRating, sortBy, sortOrder });
    onClose();
  };

  const handleReset = () => {
    setGenres([]);
    setYearRange([1900, new Date().getFullYear()]);
    setMinRating(0);
    setSortBy('popularity');
    setSortOrder('desc');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111128] rounded-2xl border border-[#1a1a3e] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#111128] border-b border-[#1a1a3e] p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Filter className="text-purple-400" />
            Advanced Filters
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Genres */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Genres</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    genres.includes(genre)
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#0b0b1a] text-gray-300 hover:bg-[#1a1a3e]'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Year Range */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Year Range</h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={yearRange[0]}
                onChange={(e) => setYearRange([parseInt(e.target.value), yearRange[1]])}
                className="w-32 px-4 py-2 bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg text-white"
              />
              <span className="text-gray-400">to</span>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={yearRange[1]}
                onChange={(e) => setYearRange([yearRange[0], parseInt(e.target.value)])}
                className="w-32 px-4 py-2 bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg text-white"
              />
            </div>
          </div>

          {/* Minimum Rating */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Minimum Rating</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-[#0b0b1a] rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-white text-lg font-semibold w-12">{minRating.toFixed(1)}</span>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Sort By</h3>
            <div className="flex gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as FilterState['sortBy'])}
                className="flex-1 px-4 py-2 bg-[#0b0b1a] border border-[#2a2a5e] rounded-lg text-white"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
              >
                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#111128] border-t border-[#1a1a3e] p-6 flex justify-end gap-4">
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-[#0b0b1a] hover:bg-[#1a1a3e] text-white rounded-lg font-medium transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
