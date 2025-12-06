import { NextResponse } from 'next/server';
import { fetchAllYouTubeContent } from '@/lib/services/youtube';
import { fetchAllBlogContent } from '@/lib/services/blogs';
import { processAllContent } from '@/lib/ai/process';
import { addContents } from '@/lib/services/storage';
import { YOUTUBE_SOURCES, BLOG_SOURCES } from '@/lib/config';

// Vercel Cron configuration
export const maxDuration = 60; // Allow up to 60 seconds for processing
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron
 * Fetches new content from ALL sources, processes with AI, and stores
 * Called by Vercel Cron (scheduled) - always fetches all sources
 */
export async function GET(request: Request) {
  // Enforce authentication in production
  if (process.env.NODE_ENV === 'production') {
    // Require CRON_SECRET to be configured
    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET environment variable is not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    
    // Verify the authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // GET always fetches all sources (used by Vercel Cron)
  return fetchAndProcessContent();
}

/**
 * POST /api/cron
 * Manual trigger - accepts optional sourceIds array to fetch only selected sources
 * This reduces costs by letting users choose which sources to process
 * 
 * Body: { sourceIds?: string[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sourceIds: string[] | undefined = body.sourceIds;
    
    // Validate sourceIds if provided
    if (sourceIds && !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: 'sourceIds must be an array' },
        { status: 400 }
      );
    }
    
    // Filter to only valid source IDs
    const allSourceIds = [...YOUTUBE_SOURCES, ...BLOG_SOURCES].map(s => s.id);
    const validSourceIds = sourceIds?.filter(id => allSourceIds.includes(id));
    
    if (sourceIds && validSourceIds && validSourceIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid source IDs provided' },
        { status: 400 }
      );
    }
    
    return fetchAndProcessContent(validSourceIds);
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/**
 * Core fetch and process logic
 * @param sourceIds - Optional array of source IDs. If undefined, fetches all sources.
 */
async function fetchAndProcessContent(sourceIds?: string[]) {
  try {
    const isSelectiveFetch = sourceIds && sourceIds.length > 0;
    console.log(isSelectiveFetch 
      ? `Starting selective content fetch for ${sourceIds.length} source(s)...`
      : 'Starting full content fetch from all sources...'
    );
    
    // Separate YouTube and blog source IDs
    const youtubeIds = sourceIds?.filter(id => 
      YOUTUBE_SOURCES.some(s => s.id === id)
    );
    const blogIds = sourceIds?.filter(id => 
      BLOG_SOURCES.some(s => s.id === id)
    );
    
    // Fetch content from selected sources in parallel
    const [youtubeContent, blogContent] = await Promise.all([
      fetchAllYouTubeContent(youtubeIds),
      fetchAllBlogContent(blogIds),
    ]);
    
    const allContent = [...youtubeContent, ...blogContent];
    console.log(`Fetched ${allContent.length} items (${youtubeContent.length} YouTube, ${blogContent.length} blogs)`);
    
    if (allContent.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new content found',
        fetched: 0,
        processed: 0,
        sourcesRequested: sourceIds?.length || 'all',
      });
    }
    
    // Process content with AI
    console.log('Processing content with AI...');
    const processedContent = await processAllContent(allContent);
    console.log(`Processed ${processedContent.length} items`);
    
    // Store the processed content
    await addContents(processedContent);
    
    return NextResponse.json({
      success: true,
      message: 'Content fetched and processed successfully',
      fetched: allContent.length,
      processed: processedContent.length,
      sourcesRequested: sourceIds?.length || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


