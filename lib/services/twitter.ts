import { TWITTER_SOURCES, FETCH_CONFIG } from '../config';
import type { RawContent, Source } from '../types';

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id?: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  attachments?: {
    media_keys?: string[];
  };
  entities?: {
    urls?: Array<{
      url: string;
      expanded_url?: string;
      display_url?: string;
    }>;
  };
}

interface TwitterMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

interface TwitterAPIResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMedia[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
  errors?: Array<{
    detail: string;
    title: string;
    type: string;
  }>;
}

interface TwitterUserResponse {
  data?: {
    id: string;
    username: string;
    name: string;
    profile_image_url?: string;
  };
  errors?: Array<{
    detail: string;
    title: string;
  }>;
}

// Cache user IDs to avoid repeated lookups
const userIdCache = new Map<string, { id: string; name: string; profileImage?: string }>();

/**
 * Generate a stable hash from a string (for creating consistent IDs)
 */
function stableHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get Twitter API bearer token from environment
 */
function getTwitterBearerToken(): string {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    throw new Error(
      'TWITTER_BEARER_TOKEN environment variable is not configured. ' +
      'Please set it to your Twitter API v2 Bearer Token.'
    );
  }
  return token;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make a Twitter API request with retry logic for rate limits
 */
async function twitterApiRequest<T>(
  url: string,
  bearerToken: string,
  retries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_CONFIG.fetchTimeoutMs),
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'User-Agent': 'AI-News-Aggregator/1.0',
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.min(15000 * Math.pow(2, attempt), 60000); // Exponential backoff, max 60s

        console.log(`Rate limited. Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${retries}...`);

        if (attempt < retries - 1) {
          await sleep(waitTime);
          continue;
        }

        throw new Error(
          `Twitter API rate limit exceeded. ` +
          `Free tier allows ~1 request per 15 seconds for user timelines. ` +
          `Please wait and try again.`
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twitter API error ${response.status}: ${errorText}`);
      }

      return await response.json() as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-rate-limit errors
      if (!lastError.message.includes('rate limit') && !lastError.message.includes('429')) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Get user ID from username (with caching)
 */
async function getUserId(username: string): Promise<{ id: string; name: string; profileImage?: string }> {
  const cleanUsername = username.replace('@', '').toLowerCase();

  // Check cache first
  if (userIdCache.has(cleanUsername)) {
    return userIdCache.get(cleanUsername)!;
  }

  const bearerToken = getTwitterBearerToken();
  const url = `https://api.twitter.com/2/users/by/username/${cleanUsername}?user.fields=profile_image_url`;

  const response = await twitterApiRequest<TwitterUserResponse>(url, bearerToken);

  if (response.errors && response.errors.length > 0) {
    throw new Error(`User lookup failed: ${response.errors[0].detail}`);
  }

  if (!response.data) {
    throw new Error(`User @${cleanUsername} not found`);
  }

  const userData = {
    id: response.data.id,
    name: response.data.name,
    profileImage: response.data.profile_image_url,
  };

  // Cache for future use
  userIdCache.set(cleanUsername, userData);

  return userData;
}

/**
 * Fetch tweets from a user's timeline using their user ID
 */
async function fetchUserTimeline(
  userId: string,
  maxResults: number = 10
): Promise<TwitterAPIResponse> {
  const bearerToken = getTwitterBearerToken();

  // Use the user timeline endpoint (better rate limits than search)
  const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
  url.searchParams.set('max_results', Math.min(Math.max(5, maxResults), 100).toString());
  url.searchParams.set('tweet.fields', 'created_at,author_id,public_metrics,attachments,entities');
  url.searchParams.set('expansions', 'author_id,attachments.media_keys');
  url.searchParams.set('user.fields', 'username,name,profile_image_url');
  url.searchParams.set('media.fields', 'type,url,preview_image_url');
  url.searchParams.set('exclude', 'retweets,replies'); // Get original tweets only

  return twitterApiRequest<TwitterAPIResponse>(url.toString(), bearerToken);
}

/**
 * Extract expanded URL from tweet entities
 */
function extractExpandedUrl(tweet: TwitterTweet): string | undefined {
  if (tweet.entities?.urls && tweet.entities.urls.length > 0) {
    return tweet.entities.urls[0].expanded_url || tweet.entities.urls[0].url;
  }
  return undefined;
}

/**
 * Extract thumbnail from tweet attachments
 */
function extractThumbnail(
  tweet: TwitterTweet,
  includes?: TwitterAPIResponse['includes']
): string | undefined {
  if (tweet.attachments?.media_keys && includes?.media) {
    const media = includes.media.find(m =>
      tweet.attachments?.media_keys?.includes(m.media_key)
    );
    return media?.preview_image_url || media?.url;
  }
  return undefined;
}

/**
 * Fetch tweets from a single Twitter source
 */
async function fetchTwitterTweets(source: Source): Promise<RawContent[]> {
  try {
    const isUsername = source.url.startsWith('@') ||
      (!source.url.includes(' ') && !source.url.startsWith('#'));

    if (!isUsername) {
      // For hashtag/search queries, we still need to use search endpoint
      // But this has stricter rate limits on free tier
      console.log(`Search queries like "${source.url}" require Twitter API Basic tier ($100/mo)`);
      return [];
    }

    // Get user ID first
    console.log(`Looking up user @${source.url.replace('@', '')}...`);
    const userData = await getUserId(source.url);
    console.log(`Found user: ${userData.name} (ID: ${userData.id})`);

    // Fetch their timeline
    console.log(`Fetching ${FETCH_CONFIG.maxItemsPerSource} tweets...`);
    const response = await fetchUserTimeline(userData.id, FETCH_CONFIG.maxItemsPerSource);

    if (response.errors && response.errors.length > 0) {
      console.error(`Twitter API errors:`, response.errors);
    }

    const tweets = response.data || [];
    const includes = response.includes;

    if (tweets.length === 0) {
      console.log(`No tweets found for @${source.url.replace('@', '')}`);
      return [];
    }

    console.log(`Retrieved ${tweets.length} tweets`);

    // Convert tweets to RawContent format
    const contents: RawContent[] = tweets.map((tweet) => {
      const thumbnail = extractThumbnail(tweet, includes);
      const expandedUrl = extractExpandedUrl(tweet);

      // Use tweet text as content
      let content = tweet.text;
      if (content.length > FETCH_CONFIG.maxContentLength) {
        content = content.slice(0, FETCH_CONFIG.maxContentLength) + '...';
      }

      // Create URL - prefer expanded URL, fallback to tweet URL
      const username = source.url.replace('@', '');
      const tweetUrl = expandedUrl || `https://twitter.com/${username}/status/${tweet.id}`;

      return {
        id: `twitter-${source.id}-${stableHash(tweet.id)}`,
        sourceId: source.id,
        title: tweet.text.slice(0, 200) || 'Tweet',
        url: tweetUrl,
        publishedAt: tweet.created_at || new Date().toISOString(),
        content: content,
        thumbnail: thumbnail || userData.profileImage,
        author: userData.name,
      };
    });

    return contents;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to fetch Twitter source ${source.name}:`, errorMessage);

    // Provide helpful error messages
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      console.log('\n💡 Tip: Twitter free tier has strict rate limits.');
      console.log('   - User lookup: 1 request per second');
      console.log('   - User tweets: 1 request per 15 seconds');
      console.log('   Wait a minute and try again.\n');
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      console.log('\n💡 Tip: Check your TWITTER_BEARER_TOKEN is valid and has no quotes.\n');
    } else if (errorMessage.includes('not found')) {
      console.log(`\n💡 Tip: User "${source.url}" may not exist or the account is private.\n`);
    }

    return [];
  }
}

/**
 * Fetch Twitter content from configured sources
 * @param sourceIds - Optional array of source IDs to filter. If empty/undefined, fetches from all sources.
 */
export async function fetchAllTwitterContent(sourceIds?: string[]): Promise<RawContent[]> {
  // Import demo mode settings
  const { TWITTER_DEMO_MODE, DEMO_TWEETS } = await import('../config');

  // Filter sources if specific IDs are provided
  const sources = sourceIds && sourceIds.length > 0
    ? TWITTER_SOURCES.filter(s => sourceIds.includes(s.id))
    : TWITTER_SOURCES;

  if (sources.length === 0) {
    console.log('No Twitter sources to fetch (none selected or configured)');
    return [];
  }

  // DEMO MODE: Return pre-configured demo tweets without hitting the API
  if (TWITTER_DEMO_MODE) {
    console.log(`[DEMO MODE] Returning ${sources.length} demo tweet(s) for: ${sources.map(s => s.name).join(', ')}`);

    const demoResults: RawContent[] = [];
    for (const source of sources) {
      const demoTweet = DEMO_TWEETS[source.id];
      if (demoTweet) {
        demoResults.push({
          id: `twitter-${source.id}-demo-${stableHash(demoTweet.text.slice(0, 50))}`,
          sourceId: source.id,
          title: demoTweet.text.slice(0, 200),
          url: demoTweet.url,
          publishedAt: demoTweet.date,
          content: demoTweet.text,
          author: demoTweet.author,
        });
      }
    }

    return demoResults;
  }

  console.log(`Fetching from ${sources.length} Twitter source(s): ${sources.map(s => s.name).join(', ')}`);

  // Fetch sequentially to respect rate limits
  const results: RawContent[] = [];
  for (const source of sources) {
    const tweets = await fetchTwitterTweets(source);
    results.push(...tweets);

    // Small delay between sources to avoid rate limits
    if (sources.indexOf(source) < sources.length - 1) {
      await sleep(1000);
    }
  }

  return results;
}
