import type { SummaryMetrics, ModelSummary, ModelStats } from '../types';

/**
 * Calculate Flesch-Kincaid readability score
 * Higher scores = easier to read (target: 60-70 for general audience)
 */
function calculateReadabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  // Count syllables (simplified)
  const syllableCount = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllableCount / words.length;
  
  // Flesch Reading Ease formula
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Count syllables in a word (simplified algorithm)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  // Remove silent e
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Calculate metrics for a summary
 */
export function calculateMetrics(
  summary: string,
  highlights: string[],
  processingTimeMs: number
): SummaryMetrics {
  const words = summary.split(/\s+/).filter(w => w.length > 0);
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    readabilityScore: calculateReadabilityScore(summary),
    highlightCount: highlights.length,
    processingTimeMs,
  };
}

/**
 * Calculate aggregate stats for a model across all its summaries
 */
export function calculateModelStats(
  modelId: string,
  modelName: string,
  summaries: ModelSummary[],
  wins: number = 0,
  losses: number = 0,
  ties: number = 0
): ModelStats {
  const modelSummaries = summaries.filter(s => s.modelId === modelId);
  
  if (modelSummaries.length === 0) {
    return {
      modelId,
      modelName,
      totalSummaries: 0,
      averageRating: 0,
      averageWordCount: 0,
      averageReadability: 0,
      averageProcessingTime: 0,
      wins,
      losses,
      ties,
    };
  }
  
  const ratedSummaries = modelSummaries.filter(s => s.rating);
  const avgRating = ratedSummaries.length > 0
    ? ratedSummaries.reduce((sum, s) => sum + (s.rating?.score || 0), 0) / ratedSummaries.length
    : 0;
  
  const avgWordCount = modelSummaries.reduce((sum, s) => sum + s.metrics.wordCount, 0) / modelSummaries.length;
  const avgReadability = modelSummaries.reduce((sum, s) => sum + s.metrics.readabilityScore, 0) / modelSummaries.length;
  const avgProcessingTime = modelSummaries.reduce((sum, s) => sum + s.metrics.processingTimeMs, 0) / modelSummaries.length;
  
  return {
    modelId,
    modelName,
    totalSummaries: modelSummaries.length,
    averageRating: Math.round(avgRating * 10) / 10,
    averageWordCount: Math.round(avgWordCount),
    averageReadability: Math.round(avgReadability),
    averageProcessingTime: Math.round(avgProcessingTime),
    wins,
    losses,
    ties,
  };
}

/**
 * Compare two summaries and return which is "better" based on auto metrics
 * Returns: 'a', 'b', or 'tie'
 */
export function autoCompare(summaryA: ModelSummary, summaryB: ModelSummary): 'a' | 'b' | 'tie' {
  let scoreA = 0;
  let scoreB = 0;
  
  // Readability (higher is better, target ~60-70)
  const readabilityTargetA = Math.abs(65 - summaryA.metrics.readabilityScore);
  const readabilityTargetB = Math.abs(65 - summaryB.metrics.readabilityScore);
  if (readabilityTargetA < readabilityTargetB) scoreA++;
  else if (readabilityTargetB < readabilityTargetA) scoreB++;
  
  // Word count (prefer concise but not too short, target 40-80 words)
  const wordCountTargetA = summaryA.metrics.wordCount >= 40 && summaryA.metrics.wordCount <= 80;
  const wordCountTargetB = summaryB.metrics.wordCount >= 40 && summaryB.metrics.wordCount <= 80;
  if (wordCountTargetA && !wordCountTargetB) scoreA++;
  else if (wordCountTargetB && !wordCountTargetA) scoreB++;
  
  // Highlights (more is generally better, up to 5)
  if (summaryA.metrics.highlightCount > summaryB.metrics.highlightCount) scoreA++;
  else if (summaryB.metrics.highlightCount > summaryA.metrics.highlightCount) scoreB++;
  
  // Processing time (faster is better)
  if (summaryA.metrics.processingTimeMs < summaryB.metrics.processingTimeMs) scoreA++;
  else if (summaryB.metrics.processingTimeMs < summaryA.metrics.processingTimeMs) scoreB++;
  
  if (scoreA > scoreB) return 'a';
  if (scoreB > scoreA) return 'b';
  return 'tie';
}


