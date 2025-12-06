import { BLOG_SOURCES, FETCH_CONFIG } from '../config';
import type { RawContent, Source } from '../types';

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content: string;
  author?: string;
  thumbnail?: string;
}

/**
 * Parse RSS/Atom feed XML
 */
function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  // Try RSS 2.0 format first
  const rssItemRegex = /<item>([\s\S]*?)<\/item>/g;
  // Try Atom format
  const atomEntryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  
  let match;
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');
  const regex = isAtom ? atomEntryRegex : rssItemRegex;
  
  while ((match = regex.exec(xml)) !== null) {
    const entry = match[1];
    
    let title = '';
    let link = '';
    let pubDate = '';
    let description = '';
    let content = '';
    let author = '';
    let thumbnail = '';
    
    if (isAtom) {
      // Atom format parsing
      title = entry.match(/<title[^>]*>([^<]+)<\/title>/)?.[1] || '';
      title = entry.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || title;
      link = entry.match(/<link[^>]+href="([^"]+)"/)?.[1] || '';
      pubDate = entry.match(/<published>([^<]+)<\/published>/)?.[1] || 
                entry.match(/<updated>([^<]+)<\/updated>/)?.[1] || '';
      description = entry.match(/<summary[^>]*>([^<]+)<\/summary>/)?.[1] || '';
      description = entry.match(/<summary[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/summary>/)?.[1] || description;
      content = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || '';
      content = entry.match(/<content[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content>/)?.[1] || content;
      author = entry.match(/<author>[\s\S]*?<name>([^<]+)<\/name>/)?.[1] || '';
    } else {
      // RSS 2.0 format parsing
      title = entry.match(/<title>([^<]+)<\/title>/)?.[1] || '';
      title = entry.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || title;
      link = entry.match(/<link>([^<]+)<\/link>/)?.[1] || '';
      pubDate = entry.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] || '';
      description = entry.match(/<description>([^<]+)<\/description>/)?.[1] || '';
      description = entry.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] || description;
      content = entry.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] || '';
      author = entry.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/)?.[1] ||
               entry.match(/<author>([^<]+)<\/author>/)?.[1] || '';
      
      // Try to extract thumbnail from media or enclosure
      thumbnail = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1] ||
                  entry.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image/)?.[1] || '';
    }
    
    if (title && link) {
      items.push({
        title: decodeHTMLEntities(title.trim()),
        link: link.trim(),
        pubDate,
        description: stripHTML(decodeHTMLEntities(description)),
        content: stripHTML(decodeHTMLEntities(content || description)),
        author,
        thumbnail,
      });
    }
  }
  
  return items.slice(0, FETCH_CONFIG.maxItemsPerSource);
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
}

/**
 * Strip HTML tags from content
 */
function stripHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a stable hash from a string (for creating consistent IDs)
 */
function stableHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Fetch articles from a single blog
 */
async function fetchBlogArticles(source: Source): Promise<RawContent[]> {
  try {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(FETCH_CONFIG.fetchTimeoutMs),
      headers: {
        'User-Agent': 'AI-News-Aggregator/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const xml = await response.text();
    const items = parseRSSFeed(xml);
    
    const contents: RawContent[] = items.map((item, index) => {
      let content = item.content || item.description;
      
      // Truncate if too long
      if (content.length > FETCH_CONFIG.maxContentLength) {
        content = content.slice(0, FETCH_CONFIG.maxContentLength) + '...';
      }
      
      return {
        id: `blog-${source.id}-${stableHash(item.link)}`,
        sourceId: source.id,
        title: item.title,
        url: item.link,
        publishedAt: item.pubDate || new Date().toISOString(),
        content: content || `Article: ${item.title}`,
        thumbnail: item.thumbnail,
        author: item.author,
      };
    });
    
    return contents;
  } catch (error) {
    console.error(`Failed to fetch blog ${source.name}:`, error);
    return [];
  }
}

/**
 * Fetch blog content from configured sources
 * @param sourceIds - Optional array of source IDs to filter. If empty/undefined, fetches from all sources.
 */
export async function fetchAllBlogContent(sourceIds?: string[]): Promise<RawContent[]> {
  // Filter sources if specific IDs are provided
  const sources = sourceIds && sourceIds.length > 0
    ? BLOG_SOURCES.filter(s => sourceIds.includes(s.id))
    : BLOG_SOURCES;
  
  if (sources.length === 0) {
    console.log('No blog sources to fetch (none selected or configured)');
    return [];
  }
  
  console.log(`Fetching from ${sources.length} blog(s): ${sources.map(s => s.name).join(', ')}`);
  
  const results = await Promise.all(
    sources.map(source => fetchBlogArticles(source))
  );
  
  return results.flat();
}


