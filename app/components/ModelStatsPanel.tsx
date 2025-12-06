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
        <span>📊</span>
        Model Performance
      </h2>
      
      <div className="space-y-4">
        {sortedStats.map((stat, index) => {
          const total = stat.wins + stat.losses + stat.ties || 1;
          const winRate = (stat.wins / total * 100).toFixed(0);
          
          return (
            <div key={stat.modelId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹'}</span>
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


