'use client';

import { useState } from 'react';
import type { ProcessedContent, ModelSummary } from '@/lib/types';
import { CATEGORIES } from '@/lib/config';

interface NewsCardProps {
  content: ProcessedContent;
  onRate?: (contentId: string, summaryId: string, score: number) => void;
  onCompare?: (contentId: string, modelA: string, modelB: string, winner: string) => void;
}

export function NewsCard({ content, onRate, onCompare }: NewsCardProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(0);
  
  const primarySummary = content.summaries[selectedSummary] || content.summaries[0];
  const category = CATEGORIES.find(c => c.id === primarySummary?.category);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const handleWinnerSelect = (winner: string) => {
    if (content.summaries.length >= 2 && onCompare) {
      onCompare(
        content.id,
        content.summaries[0].modelId,
        content.summaries[1].modelId,
        winner
      );
    }
  };
  
  return (
    <article className="group relative overflow-hidden rounded-2xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 transition-all duration-300 hover:border-zinc-700/50 hover:bg-zinc-900">
      {/* Thumbnail */}
      {content.thumbnail && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={content.thumbnail}
            alt={content.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
        </div>
      )}
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {content.sourceName}
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-xs text-zinc-600">
              {formatDate(content.publishedAt)}
            </span>
          </div>
          {category && (
            <span
              className="px-2.5 py-1 text-xs font-medium rounded-full"
              style={{ 
                backgroundColor: `${category.color}20`,
                color: category.color 
              }}
            >
              {category.label}
            </span>
          )}
        </div>
        
        {/* Title */}
        <h3 className="mb-3">
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-zinc-100 hover:text-white transition-colors line-clamp-2"
          >
            {content.title}
          </a>
        </h3>
        
        {/* Summary */}
        {primarySummary && (
          <p className="text-sm text-zinc-400 leading-relaxed mb-4 line-clamp-3">
            {primarySummary.summary}
          </p>
        )}
        
        {/* Highlights */}
        {primarySummary?.highlights && primarySummary.highlights.length > 0 && (
          <div className="space-y-2 mb-4">
            {primarySummary.highlights.slice(0, 3).map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-xs text-zinc-500 line-clamp-1">{highlight}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Model Info & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">Summarized by</span>
            <div className="flex gap-1">
              {content.summaries.map((summary, idx) => (
                <button
                  key={summary.id}
                  onClick={() => setSelectedSummary(idx)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    idx === selectedSummary
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  {summary.modelName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          
          {content.summaries.length >= 2 && (
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showComparison ? 'Hide' : 'Compare'} →
            </button>
          )}
        </div>
        
        {/* Comparison Panel */}
        {showComparison && content.summaries.length >= 2 && (
          <div className="mt-4 pt-4 border-t border-zinc-800/50 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {content.summaries.slice(0, 2).map((summary, idx) => (
                <div
                  key={summary.id}
                  className={`p-3 rounded-lg ${
                    idx === 0 ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-purple-500/5 border border-purple-500/20'
                  }`}
                >
                  <div className={`text-xs font-medium mb-2 ${idx === 0 ? 'text-blue-400' : 'text-purple-400'}`}>
                    {summary.modelName}
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-4 mb-2">
                    {summary.summary}
                  </p>
                  <div className="text-[10px] text-zinc-600 space-y-1">
                    <div>{summary.metrics.wordCount} words</div>
                    <div>Readability: {summary.metrics.readabilityScore}</div>
                    <div>{summary.metrics.processingTimeMs}ms</div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Vote buttons */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-zinc-600">Pick winner:</span>
              <button
                onClick={() => handleWinnerSelect(content.summaries[0].modelId)}
                className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                {content.summaries[0].modelName.split(' ')[0]}
              </button>
              <button
                onClick={() => handleWinnerSelect('tie')}
                className="px-3 py-1.5 text-xs bg-zinc-700 text-zinc-400 rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Tie
              </button>
              <button
                onClick={() => handleWinnerSelect(content.summaries[1].modelId)}
                className="px-3 py-1.5 text-xs bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                {content.summaries[1].modelName.split(' ')[0]}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}


