// Source types
export type SourceType = 'youtube' | 'blog' | 'twitter';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string; // RSS feed URL or channel URL
  icon?: string;
}

// Content types
export interface RawContent {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  publishedAt: string;
  content: string; // Full text or transcript
  thumbnail?: string;
  author?: string;
}

// AI-processed content
export interface ProcessedContent {
  id: string;
  rawContentId: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  title: string;
  url: string;
  publishedAt: string;
  thumbnail?: string;
  author?: string;
  processedAt: string;
  summaries: ModelSummary[];
}

export interface ModelSummary {
  id: string;
  modelId: string;
  modelName: string;
  summary: string;
  highlights: string[];
  category: ContentCategory;
  metrics: SummaryMetrics;
  rating?: ManualRating;
}

export type ContentCategory = 
  | 'research'
  | 'product-launch'
  | 'tutorial'
  | 'opinion'
  | 'news'
  | 'analysis'
  | 'other';

export interface SummaryMetrics {
  wordCount: number;
  sentenceCount: number;
  readabilityScore: number; // Flesch-Kincaid
  highlightCount: number;
  processingTimeMs: number;
}

export interface ManualRating {
  score: number; // 1-5
  ratedAt: string;
}

// Model comparison
export interface ModelComparison {
  id: string;
  contentId: string;
  modelA: string;
  modelB: string;
  winner?: string; // modelId or 'tie'
  comparedAt: string;
}

export interface ModelStats {
  modelId: string;
  modelName: string;
  totalSummaries: number;
  averageRating: number;
  averageWordCount: number;
  averageReadability: number;
  averageProcessingTime: number;
  wins: number;
  losses: number;
  ties: number;
}

// Storage types
export interface StorageData {
  contents: ProcessedContent[];
  comparisons: ModelComparison[];
  lastFetchedAt: string;
  lastEmailSentAt?: string;
}

// API response types
export interface NewsResponse {
  contents: ProcessedContent[];
  stats: ModelStats[];
  lastUpdated: string;
}

// AI SDK response schemas
export interface AISummaryResponse {
  summary: string;
  highlights: string[];
  category: ContentCategory;
}


