import type { Source } from './types';

// YouTube sources - disabled for now until transcript fetching is fixed
export const YOUTUBE_SOURCES: Source[] = [
  // {
  //   id: 'AICodeKing',
  //   name: 'AICodeKing',
  //   type: 'youtube',
  //   url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0m81bQuthaQZmFbXEY9QSw',
  //   icon: '🔥',
  // },
];

// Using a test source with hardcoded content for MVP demo
export const BLOG_SOURCES: Source[] = [
  {
    id: 'test-article',
    name: 'Test Article',
    type: 'blog',
    url: 'TEST_MODE', // Special flag - will use hardcoded content
    icon: '🧪',
  },
];

// All sources combined
export const ALL_SOURCES: Source[] = [...YOUTUBE_SOURCES, ...BLOG_SOURCES];

// Model pool for A/B testing - using OpenRouter model IDs
export const MODEL_POOL = [
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
  },
];

// Number of models to use per content item (for A/B comparison)
export const MODELS_PER_CONTENT = 2;

// Content categories for AI classification
export const CATEGORIES = [
  { id: 'research', label: 'Research', color: '#8B5CF6' },
  { id: 'product-launch', label: 'Product Launch', color: '#10B981' },
  { id: 'tutorial', label: 'Tutorial', color: '#F59E0B' },
  { id: 'opinion', label: 'Opinion', color: '#EC4899' },
  { id: 'news', label: 'News', color: '#3B82F6' },
  { id: 'analysis', label: 'Analysis', color: '#6366F1' },
  { id: 'other', label: 'Other', color: '#6B7280' },
] as const;

// Fetch settings
export const FETCH_CONFIG = {
  maxItemsPerSource: 5, // Max items to fetch per source
  maxContentLength: 15000, // Max characters of content to send to AI
  fetchTimeoutMs: 30000, // 30 second timeout
};

// Email settings
export const EMAIL_CONFIG = {
  fromEmail: 'AI News <onboarding@resend.dev>', // Use your verified domain
  subject: 'Your Daily AI News Digest',
};


