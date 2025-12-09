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

// Twitter sources - configure usernames (with or without @) or search queries
// Examples:
// - Username: '@openai' or 'openai' (fetches tweets from that user)
// - Hashtag: '#AI' (fetches tweets with that hashtag)
// - Search: 'AI news -is:retweet' (fetches tweets matching search query)
export const TWITTER_SOURCES: Source[] = [
  {
    id: 'karpathy-twitter',
    name: 'Andrej Karpathy',
    type: 'twitter',
    url: '@karpathy',
    icon: '🧠',
  },
  {
    id: 'anthropic-twitter',
    name: 'Anthropic',
    type: 'twitter',
    url: '@AnthropicAI',
    icon: '🔮',
  },
  {
    id: 'openai-twitter',
    name: 'OpenAI',
    type: 'twitter',
    url: '@OpenAI',
    icon: '🤖',
  },
  {
    id: 'gemini-twitter',
    name: 'Gemini',
    type: 'twitter',
    url: '@GeminiApp',
    icon: '✨',
  },
];

// All sources combined
export const ALL_SOURCES: Source[] = [...YOUTUBE_SOURCES, ...BLOG_SOURCES, ...TWITTER_SOURCES];

// Model pool for A/B testing - using OpenRouter model IDs
// Using cost-effective models only (Claude Haiku removed - 5x more expensive)
export const MODEL_POOL = [
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
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
  maxItemsPerSource: 10, // Max items to fetch per source
  maxContentLength: 15000, // Max characters of content to send to AI
  fetchTimeoutMs: 30000, // 30 second timeout
};

// Email settings
export const EMAIL_CONFIG = {
  fromEmail: 'AI News <onboarding@resend.dev>', // Use your verified domain
  subject: 'Your Daily AI News Digest',
};


