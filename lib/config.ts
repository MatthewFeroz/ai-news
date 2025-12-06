import type { Source } from './types';

export const YOUTUBE_SOURCES: Source[] = [
  {
    id: 'AICodeKing',
    name: 'AICodeKing',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0m81bQuthaQZmFbXEY9QSw',
    icon: '🔥',
  },
  {
    id: 't3dotgg',
    name: 'Theo - t3.gg',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCtuO2h6OwDueF7h3p8DYYjQ',
    icon: '🎯',
  },
  {
    id: 'CalebWritesCode',
    name: 'Caleb Writes Code',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCuU9jE4MHHEIyYMbDfUPSew',
    icon: '💻',
  },
];

// AI company blogs with RSS feeds
export const BLOG_SOURCES: Source[] = [
  {
    id: 'openai',
    name: 'OpenAI Blog',
    type: 'blog',
    url: 'https://openai.com/blog/rss.xml',
    icon: '🤖',
  },
  {
    id: 'anthropic',
    name: 'Anthropic News',
    type: 'blog',
    url: 'https://www.anthropic.com/rss.xml',
    icon: '🧠',
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    type: 'blog',
    url: 'https://deepmind.google/blog/rss.xml',
    icon: '🔬',
  },
  {
    id: 'meta-ai',
    name: 'Meta AI Blog',
    type: 'blog',
    url: 'https://ai.meta.com/blog/rss/',
    icon: '👁️',
  },
  {
    id: 'microsoft-ai',
    name: 'Microsoft AI Blog',
    type: 'blog',
    url: 'https://blogs.microsoft.com/ai/feed/',
    icon: '💼',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Blog',
    type: 'blog',
    url: 'https://huggingface.co/blog/feed.xml',
    icon: '🤗',
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
    id: 'openai/gpt-5.1-chat',
    name: 'GPT 5.1 Chat',
    provider: 'OpenAI',
  },
  {
    id: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    provider: 'Moonshot AI',
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


