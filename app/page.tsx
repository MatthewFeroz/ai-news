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

  const validIds = ALL_SOURCES.map(s => s.id);

  try {
    const saved = localStorage.getItem(SELECTED_SOURCES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filter to only valid source IDs that exist in current config
        const validSaved = parsed.filter(id => validIds.includes(id));
        if (validSaved.length > 0) {
          return validSaved;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load saved sources:', e);
  }
  // Default to all sources if no valid saved sources
  return validIds;
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
  const [selectedType, setSelectedType] = useState<'all' | 'youtube' | 'blog' | 'twitter'>('all');

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
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">AI News</h1>
                  <p className="text-xs text-zinc-500">Twitter Summaries</p>
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
                    <div className="w-16 h-16 mx-auto mb-4 bg-zinc-800 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">No tweets yet</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      Select Twitter accounts and click refresh to fetch the latest AI news
                    </p>
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-xs text-zinc-600">
                        {selectedSources.length} account{selectedSources.length !== 1 ? 's' : ''} selected
                      </p>
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || selectedSources.length === 0}
                        className="px-6 py-2.5 bg-emerald-500 text-black font-medium rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRefreshing ? 'Fetching...' : selectedSources.length === 0 ? 'Select Accounts' : 'Fetch Tweets'}
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
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Quick Stats
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-800/50 rounded-xl col-span-2">
                      <div className="text-3xl font-bold text-blue-400">
                        {contents.filter(c => c.sourceType === 'twitter').length}
                      </div>
                      <div className="text-xs text-zinc-500">Twitter Summaries</div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-emerald-400">{contents.length}</div>
                      <div className="text-xs text-zinc-500">Total Items</div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-zinc-400">{stats.length}</div>
                      <div className="text-xs text-zinc-500">AI Models</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer with Roadmap */}
        <footer className="border-t border-zinc-800/50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Roadmap Section */}
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-zinc-100 mb-6 text-center">Roadmap</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current */}
                <div className="bg-zinc-900/50 rounded-2xl border border-emerald-500/30 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-emerald-400">Now</span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200 mb-2">Twitter Integration</h3>
                  <ul className="text-xs text-zinc-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      AI-powered tweet summaries
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Follow key AI accounts
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Model comparison
                    </li>
                  </ul>
                </div>

                {/* Next */}
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-700/50 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-400">Next</span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200 mb-2">YouTube Integration</h3>
                  <ul className="text-xs text-zinc-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-4 h-4 border border-zinc-600 rounded mt-0.5 flex-shrink-0"></div>
                      Video transcript summaries
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-4 h-4 border border-zinc-600 rounded mt-0.5 flex-shrink-0"></div>
                      Channel subscriptions
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-4 h-4 border border-zinc-600 rounded mt-0.5 flex-shrink-0"></div>
                      Key moments extraction
                    </li>
                  </ul>
                </div>

                {/* Future */}
                <div className="bg-zinc-900/50 rounded-2xl border border-zinc-700/50 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-purple-400">Future</span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200 mb-2">More Sources</h3>
                  <ul className="text-xs text-zinc-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-4 h-4 border border-zinc-600 rounded mt-0.5 flex-shrink-0"></div>
                      Blog RSS feeds
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-4 h-4 border border-zinc-600 rounded mt-0.5 flex-shrink-0"></div>
                      Email digest delivery
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-4 h-4 border border-zinc-600 rounded mt-0.5 flex-shrink-0"></div>
                      Custom source imports
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-zinc-600">
              AI News Aggregator • Powered by Vercel AI SDK + OpenRouter
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
