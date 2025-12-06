import { YoutubeTranscript } from 'youtube-transcript';
import { YOUTUBE_SOURCES, FETCH_CONFIG } from '../config';
import type { RawContent, Source } from '../types';

interface YouTubeRSSItem {
  id: string;
  title: string;
  link: string;
  published: string;
  author: string;
  thumbnail: string;
}

/**
 * Parse YouTube RSS feed XML
 */
function parseYouTubeRSS(xml: string): YouTubeRSSItem[] {
  const items: YouTubeRSSItem[] = [];
  
  // Simple regex-based parsing for YouTube RSS
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] || '';
    const title = entry.match(/<title>([^<]+)<\/title>/)?.[1] || '';
    const link = entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1] || '';
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] || '';
    const author = entry.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/)?.[1] || '';
    const thumbnail = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1] || '';
    
    if (videoId && title) {
      items.push({
        id: videoId,
        title: decodeHTMLEntities(title),
        link,
        published,
        author,
        thumbnail,
      });
    }
  }
  
  return items.slice(0, FETCH_CONFIG.maxItemsPerSource);
}

/**
 * Decode HTML entities in text
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Fetch transcript for a YouTube video
 */
async function fetchTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcript.map(item => item.text).join(' ');
    
    // Truncate if too long
    if (text.length > FETCH_CONFIG.maxContentLength) {
      return text.slice(0, FETCH_CONFIG.maxContentLength) + '...';
    }
    
    return text;
  } catch (error) {
    console.error(`Failed to fetch transcript for ${videoId}:`, error);
    return '';
  }
}

/**
 * Fetch videos from a single YouTube channel
 */
async function fetchChannelVideos(source: Source): Promise<RawContent[]> {
  try {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(FETCH_CONFIG.fetchTimeoutMs),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const xml = await response.text();
    const items = parseYouTubeRSS(xml);
    
    // Fetch transcripts for each video - only include videos with actual transcripts
    const contentPromises = items.map(async (item) => {
      const transcript = await fetchTranscript(item.id);
      
      // Skip videos without transcripts - they can't be properly summarized
      if (!transcript || transcript.length < 100) {
        console.log(`Skipping video "${item.title}" - no transcript available`);
        return null;
      }
      
      return {
        id: `yt-${item.id}`,
        sourceId: source.id,
        title: item.title,
        url: item.link,
        publishedAt: item.published,
        content: transcript,
        thumbnail: item.thumbnail,
        author: item.author,
      };
    });
    
    const results = await Promise.all(contentPromises);
    return results.filter((item): item is RawContent => item !== null);
  } catch (error) {
    console.error(`Failed to fetch YouTube channel ${source.name}:`, error);
    return [];
  }
}

/**
 * Fetch YouTube content from configured channels
 * @param sourceIds - Optional array of source IDs to filter. If empty/undefined, fetches from all sources.
 */
export async function fetchAllYouTubeContent(sourceIds?: string[]): Promise<RawContent[]> {
  // Filter sources if specific IDs are provided
  const sources = sourceIds && sourceIds.length > 0
    ? YOUTUBE_SOURCES.filter(s => sourceIds.includes(s.id))
    : YOUTUBE_SOURCES;
  
  if (sources.length === 0) {
    console.log('No YouTube sources to fetch (none selected or configured)');
    return [];
  }
  
  console.log(`Fetching from ${sources.length} YouTube channel(s): ${sources.map(s => s.name).join(', ')}`);
  
  const results = await Promise.all(
    sources.map(source => fetchChannelVideos(source))
  );
  
  return results.flat();
}

/**
 * Get YouTube RSS feed URL from channel ID
 * Helper for users to add channels
 */
export function getYouTubeRSSUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}


