'use client';

import { YOUTUBE_SOURCES, BLOG_SOURCES, TWITTER_SOURCES } from '@/lib/config';

interface SourceSelectorProps {
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function SourceSelector({
  selectedSources,
  onSourcesChange,
  isOpen,
  onToggle,
}: SourceSelectorProps) {
  const toggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      onSourcesChange(selectedSources.filter(id => id !== sourceId));
    } else {
      onSourcesChange([...selectedSources, sourceId]);
    }
  };

  const selectAll = (sources: typeof YOUTUBE_SOURCES) => {
    const newSources = new Set(selectedSources);
    sources.forEach(s => newSources.add(s.id));
    onSourcesChange(Array.from(newSources));
  };

  const deselectAll = (sources: typeof YOUTUBE_SOURCES) => {
    const sourceIds = new Set(sources.map(s => s.id));
    onSourcesChange(selectedSources.filter(id => !sourceIds.has(id)));
  };

  const youtubeSelected = YOUTUBE_SOURCES.filter(s => selectedSources.includes(s.id)).length;
  const blogSelected = BLOG_SOURCES.filter(s => selectedSources.includes(s.id)).length;
  const twitterSelected = TWITTER_SOURCES.filter(s => selectedSources.includes(s.id)).length;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-xl border border-zinc-700/50 transition-all"
      >
        <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <span className="text-sm text-zinc-300">Sources</span>
        <span className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded-full">
          {selectedSources.length}/{YOUTUBE_SOURCES.length + BLOG_SOURCES.length + TWITTER_SOURCES.length}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-zinc-700/50 shadow-2xl z-50 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-200">Select Sources</h3>
              <p className="text-xs text-zinc-500">
                Fewer sources = lower AI costs
              </p>
            </div>

            {/* Twitter Section - Primary Focus */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Twitter ({twitterSelected}/{TWITTER_SOURCES.length})
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => selectAll(TWITTER_SOURCES)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20"
                  >
                    All
                  </button>
                  <button
                    onClick={() => deselectAll(TWITTER_SOURCES)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-500/10 hover:bg-zinc-500/20"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
                {TWITTER_SOURCES.map(source => (
                  <label
                    key={source.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(source.id)}
                      onChange={() => toggleSource(source.id)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-zinc-300">{source.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Coming Soon Section */}
            <div className="pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Coming Soon</span>
              </div>
              <div className="space-y-2 opacity-50">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30">
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                    <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="text-xs text-zinc-500">YouTube Channels</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <span className="text-xs text-zinc-500">AI Lab Blogs</span>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {selectedSources.length === 0 && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400">
                  Select at least one source to fetch news
                </p>
              </div>
            )}

            {selectedSources.length > 0 && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-xs text-emerald-400">
                  {selectedSources.length} account{selectedSources.length > 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

