'use client';

import { useState, useEffect, useCallback } from 'react';
import { NewsCard } from './components/NewsCard';
import { FilterBar } from './components/FilterBar';
import { ModelStatsPanel } from './components/ModelStatsPanel';
import { SourceSelector } from './components/SourceSelector';
import { ALL_SOURCES } from '@/lib/config';
import type { ProcessedContent, ModelStats } from '@/lib/types';

interface NewsResponse {
  contents: ProcessedContent[];
  stats: ModelStats[];
  lastUpdated: string;
}

// LocalStorage key for persisting selected sources
const SELECTED_SOURCES_KEY = 'ai-news-selected-sources';

// Get initial sources from localStorage or default to all
function getInitialSources(): string[] {
  if (typeof window === 'undefined') return ALL_SOURCES.map(s => s.id);
  try {
    const saved = localStorage.getItem(SELECTED_SOURCES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load saved sources:', e);
  }
  // Default to all sources
  return ALL_SOURCES.map(s => s.id);
}

export default function Home() {
  const [contents, setContents] = useState<ProcessedContent[]>([]);
  const [stats, setStats] = useState<ModelStats[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Source selection (persisted to localStorage)
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'youtube' | 'blog'>('all');
  
  // Initialize selected sources from localStorage on mount
  useEffect(() => {
    setSelectedSources(getInitialSources());
  }, []);
  
  // Save selected sources to localStorage when changed
  const handleSourcesChange = (sources: string[]) => {
    setSelectedSources(sources);
    try {
      localStorage.setItem(SELECTED_SOURCES_KEY, JSON.stringify(sources));
    } catch (e) {
      console.error('Failed to save sources:', e);
    }
  };
  
  // Fetch news data
  const fetchNews = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedType !== 'all') params.set('type', selectedType);
      
      const response = await fetch(`/api/news?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch news');
      
      const data: NewsResponse = await response.json();
      setContents(data.contents);
      setStats(data.stats);
      setLastUpdated(data.lastUpdated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedType]);
  
  // Initial load
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);
  
  // Trigger content refresh (calls the cron endpoint with selected sources)
  const handleRefresh = async () => {
    if (selectedSources.length === 0) {
      setError('Please select at least one source to fetch');
      return;
    }
    
    setIsRefreshing(true);
    setError(null);
    try {
      // Send only selected sources to reduce AI processing costs
      const response = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: selectedSources }),
      });
      const result = await response.json();
      
      if (result.success) {
        // Refetch the news after processing
        await fetchNews();
      } else {
        setError(result.error || 'Refresh failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle comparison vote
  const handleCompare = async (
    contentId: string,
    modelA: string,
    modelB: string,
    winner: string
  ) => {
    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, modelA, modelB, winner }),
      });
      
      // Refetch to update stats
      await fetchNews();
    } catch (err) {
      console.error('Failed to record comparison:', err);
    }
  };
  
  // Handle rating
  const handleRate = async (
    contentId: string,
    summaryId: string,
    score: number
  ) => {
    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, summaryId, score }),
      });
    } catch (err) {
      console.error('Failed to save rating:', err);
    }
  };
  
  const formatLastUpdated = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Close source selector when clicking outside
  const handleClickOutside = () => {
    if (isSourceSelectorOpen) {
      setIsSourceSelectorOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-black" onClick={handleClickOutside}>
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
      
      <div className="relative">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-zinc-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">AI News</h1>
                  <p className="text-xs text-zinc-500">Aggregated & Summarized</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-zinc-600">
                  Updated {formatLastUpdated(lastUpdated)}
                </div>
                
                {/* Source Selector */}
                <SourceSelector
                  selectedSources={selectedSources}
                  onSourcesChange={handleSourcesChange}
                  isOpen={isSourceSelectorOpen}
                  onToggle={() => setIsSourceSelectorOpen(!isSourceSelectorOpen)}
                />
                
                <button
                  onClick={async () => {
                    await fetch('/api/cron/email', { method: 'POST' });
                    alert('Email digest sent!');
                  }}
                  className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  📧 Send Digest
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Bar */}
          <div className="mb-8">
            <FilterBar
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              onCategoryChange={setSelectedCategory}
              onTypeChange={setSelectedType}
              onRefresh={handleRefresh}
              isLoading={isRefreshing}
            />
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          
          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-sm text-zinc-500">Loading news...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* News Feed */}
              <div className="lg:col-span-2 space-y-6">
                {contents.length === 0 ? (
                  <div className="text-center py-20">
                    <span className="text-4xl mb-4 block">📰</span>
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">No news yet</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      Select your sources and click refresh to fetch the latest AI news
                    </p>
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-xs text-zinc-600">
                        {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected
                        {selectedSources.length > 0 && ` (~${selectedSources.length * 2} AI calls)`}
                      </p>
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || selectedSources.length === 0}
                        className="px-6 py-2.5 bg-emerald-500 text-black font-medium rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRefreshing ? 'Fetching...' : selectedSources.length === 0 ? 'Select Sources First' : 'Fetch News'}
                      </button>
                    </div>
                  </div>
                ) : (
                  contents.map((content) => (
                    <NewsCard
                      key={content.id}
                      content={content}
                      onRate={handleRate}
                      onCompare={handleCompare}
                    />
                  ))
                )}
              </div>
              
              {/* Sidebar - Model Stats */}
              <div className="space-y-6">
                <ModelStatsPanel stats={stats} />
                
                {/* Quick Stats */}
                <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
                  <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                    <span>📈</span>
                    Quick Stats
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-emerald-400">{contents.length}</div>
                      <div className="text-xs text-zinc-500">Total Articles</div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-400">{stats.length}</div>
                      <div className="text-xs text-zinc-500">Models Tested</div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-400">
                        {contents.filter(c => c.sourceType === 'youtube').length}
                      </div>
                      <div className="text-xs text-zinc-500">YouTube</div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-amber-400">
                        {contents.filter(c => c.sourceType === 'blog').length}
                      </div>
                      <div className="text-xs text-zinc-500">Blog Posts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        
        {/* Footer */}
        <footer className="border-t border-zinc-800/50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center text-xs text-zinc-600">
              AI News Aggregator • Powered by Vercel AI SDK v5 + OpenRouter
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
