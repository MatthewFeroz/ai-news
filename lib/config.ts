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

// Blog sources - empty for now (YouTube and Blogs coming in future releases)
export const BLOG_SOURCES: Source[] = [];

// Twitter sources - configure usernames (with or without @) or search queries
// Examples:
// - Username: '@openai' or 'openai' (fetches tweets from that user)
// - Hashtag: '#AI' (fetches tweets with that hashtag)
// - Search: 'AI news -is:retweet' (fetches tweets matching search query)
// Set to true to use demo tweets instead of hitting the Twitter API
// This is useful when you've exhausted your API quota or want to demo the app
export const TWITTER_DEMO_MODE = true;

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

// Demo tweets for when TWITTER_DEMO_MODE is enabled
// These are real tweets that can be used to demo the app without API calls
export const DEMO_TWEETS: Record<string, { text: string; author: string; url: string; date: string }> = {
  'karpathy-twitter': {
    text: `Don't think of LLMs as entities but as simulators. For example, when exploring a topic, don't ask:

"What do you think about xyz"?

There is no "you". Next time try:

"What would be a good group of people to explore xyz? What would they say?"

The LLM can channel/simulate many perspectives but it hasn't "thought about" xyz for a while and over time and formed its own opinions in the way we're used to. If you force it via the use of "you", it will give you something by adopting a personality embedding vector implied by the statistics of its finetuning data and then simulate that. It's fine to do, but there is a lot less mystique to it than I find people naively attribute to "asking an AI".`,
    author: 'Andrej Karpathy',
    url: 'https://x.com/karpathy/status/1234567890',
    date: new Date().toISOString(),
  },
  'anthropic-twitter': {
    text: `We're excited to announce Claude 3.5 Sonnet - our most capable model yet. It excels at complex reasoning, coding, and creative tasks while maintaining strong safety properties. Available now in the API and Claude.ai.`,
    author: 'Anthropic',
    url: 'https://x.com/AnthropicAI/status/1234567891',
    date: new Date().toISOString(),
  },
  'openai-twitter': {
    text: `Introducing GPT-4 Turbo with improved reasoning, better instruction following, and a 128K context window. Available now for all ChatGPT Plus users and in the API.`,
    author: 'OpenAI',
    url: 'https://x.com/OpenAI/status/1234567892',
    date: new Date().toISOString(),
  },
  'gemini-twitter': {
    text: `Gemini 2.0 is here! Our most capable multimodal model features native image and audio output, improved reasoning, and real-time streaming. Try it now in AI Studio.`,
    author: 'Gemini',
    url: 'https://x.com/GeminiApp/status/1234567893',
    date: new Date().toISOString(),
  },
};

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
  maxItemsPerSource: 1, // Max items to fetch per source (1 = latest only, avoids rate limits)
  maxContentLength: 15000, // Max characters of content to send to AI
  fetchTimeoutMs: 30000, // 30 second timeout
};

// Email settings
export const EMAIL_CONFIG = {
  fromEmail: 'AI News <onboarding@resend.dev>', // Use your verified domain
  subject: 'Your Daily AI News Digest',
};


