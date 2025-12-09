'use client';

import { CATEGORIES, ALL_SOURCES } from '@/lib/config';

interface FilterBarProps {
  selectedCategory: string | null;
  selectedType: 'all' | 'youtube' | 'blog' | 'twitter';
  onCategoryChange: (category: string | null) => void;
  onTypeChange: (type: 'all' | 'youtube' | 'blog' | 'twitter') => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function FilterBar({
  selectedCategory,
  selectedType,
  onCategoryChange,
  onTypeChange,
  onRefresh,
  isLoading,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50">
      {/* Source Type Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Source</span>
        <div className="flex gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'twitter', label: 'Twitter' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => onTypeChange(type.id as 'all' | 'youtube' | 'blog' | 'twitter')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${selectedType === type.id
                  ? 'bg-white text-black font-medium'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
        <span className="text-xs text-zinc-500 uppercase tracking-wider flex-shrink-0">Category</span>
        <div className="flex gap-1">
          <button
            onClick={() => onCategoryChange(null)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex-shrink-0 ${selectedCategory === null
                ? 'bg-white text-black font-medium'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
          >
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all flex-shrink-0 ${selectedCategory === category.id
                  ? 'font-medium'
                  : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              style={{
                backgroundColor: selectedCategory === category.id ? `${category.color}30` : undefined,
                color: selectedCategory === category.id ? category.color : '#a1a1aa',
              }}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-xs font-medium">
          {isLoading ? 'Fetching...' : 'Refresh'}
        </span>
      </button>
    </div>
  );
}


