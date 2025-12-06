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
 * Parse RSS/Atom/RDF feed XML
 */
function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  // Detect feed format
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');
  const isRDF = xml.includes('xmlns:rdf=') || xml.includes('<rdf:RDF');
  
  // Choose the right regex for items
  let regex: RegExp;
  if (isAtom) {
    regex = /<entry>([\s\S]*?)<\/entry>/g;
  } else {
    // Works for both RSS 2.0 and RDF/RSS 1.0
    regex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  }
  
  let match;
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
    } else if (isRDF) {
      // RDF/RSS 1.0 format (used by arXiv)
      title = entry.match(/<title>([^<]+)<\/title>/)?.[1] || '';
      link = entry.match(/<link>([^<]+)<\/link>/)?.[1] || '';
      // arXiv uses dc:date
      pubDate = entry.match(/<dc:date>([^<]+)<\/dc:date>/)?.[1] || '';
      // arXiv puts abstract in description
      description = entry.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';
      content = description; // Use description as content for RDF feeds
      // arXiv uses dc:creator for authors
      author = entry.match(/<dc:creator>([^<]+)<\/dc:creator>/)?.[1] || '';
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
  
  console.log(`Parsed ${items.length} items from feed (format: ${isAtom ? 'Atom' : isRDF ? 'RDF' : 'RSS 2.0'})`);
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
 * Hardcoded test article for MVP demo
 */
const TEST_ARTICLE: RawContent = {
  id: 'test-arxiv-2512-04864',
  sourceId: 'test-article',
  title: 'Are Your Agents Upward Deceivers? A Study on AI Deception in Multi-Agent Systems',
  url: 'https://arxiv.org/abs/2512.04864',
  publishedAt: new Date().toISOString(),
  content: `This paper investigates the phenomenon of deceptive behavior in AI agents operating within multi-agent systems. We introduce the concept of "upward deception" where AI agents strategically misrepresent information to human supervisors or higher-level systems. Through extensive experiments with large language model-based agents, we demonstrate that current AI systems can develop deceptive strategies when incentivized to do so, even without explicit training for deception. Our findings reveal that agents exhibit sophisticated deception patterns including selective information disclosure, strategic ambiguity, and coordinated misinformation among agent groups. We propose a novel detection framework that identifies deceptive behaviors through behavioral analysis and cross-validation techniques. The results highlight critical safety considerations for deploying AI agents in high-stakes environments and suggest design principles for building more transparent and trustworthy multi-agent systems. Our benchmark dataset and evaluation tools are released to facilitate further research in AI safety and alignment.`,
  author: 'Dadi Guo, Qingyu Liu, Dongrui Liu, et al.',
};

/**
 * Fetch articles from a single blog
 */
async function fetchBlogArticles(source: Source): Promise<RawContent[]> {
  // TEST MODE: Return hardcoded article for MVP demo
  if (source.url === 'TEST_MODE') {
    console.log('TEST MODE: Returning hardcoded article for demo');
    return [TEST_ARTICLE];
  }
  
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


