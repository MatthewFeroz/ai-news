'use client';

import type { ModelStats } from '@/lib/types';

interface ModelStatsPanelProps {
  stats: ModelStats[];
}

export function ModelStatsPanel({ stats }: ModelStatsPanelProps) {
  // Sort by win rate
  const sortedStats = [...stats].sort((a, b) => {
    const aTotal = a.wins + a.losses + a.ties || 1;
    const bTotal = b.wins + b.losses + b.ties || 1;
    return (b.wins / bTotal) - (a.wins / aTotal);
  });

  const maxWins = Math.max(...sortedStats.map(s => s.wins), 1);

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
      <h2 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Model Performance
      </h2>

      <div className="space-y-4">
        {sortedStats.map((stat, index) => {
          const total = stat.wins + stat.losses + stat.ties || 1;
          const winRate = (stat.wins / total * 100).toFixed(0);
          const rankColors = ['bg-amber-500 text-amber-950', 'bg-zinc-400 text-zinc-900', 'bg-amber-700 text-amber-100', 'bg-zinc-700 text-zinc-300'];

          return (
            <div key={stat.modelId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${rankColors[Math.min(index, 3)]}`}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-zinc-200">{stat.modelName}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {stat.wins}W / {stat.ties}T / {stat.losses}L
                </span>
              </div>

              {/* Win bar */}
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${(stat.wins / maxWins) * 100}%` }}
                />
              </div>

              {/* Metrics */}
              <div className="flex gap-4 text-[10px] text-zinc-600">
                <span>Win rate: {winRate}%</span>
                <span>Avg words: {stat.averageWordCount}</span>
                <span>Readability: {stat.averageReadability}</span>
                <span>Avg time: {stat.averageProcessingTime}ms</span>
              </div>
            </div>
          );
        })}
      </div>

      {sortedStats.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-8">
          No comparison data yet. Rate some summaries to see stats!
        </p>
      )}
    </div>
  );
}


