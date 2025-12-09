import { NextResponse } from 'next/server';
import { fetchAllYouTubeContent } from '@/lib/services/youtube';
import { fetchAllBlogContent } from '@/lib/services/blogs';
import { fetchAllTwitterContent } from '@/lib/services/twitter';
import { processAllContent } from '@/lib/ai/process';
import { createDailyDigest, batchProcessBySource } from '@/lib/ai/batch-process';
import { addContents } from '@/lib/services/storage';
import { YOUTUBE_SOURCES, BLOG_SOURCES, TWITTER_SOURCES } from '@/lib/config';

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
    // Batch mode: combine all tweets into a single summary (much cheaper)
    const useBatchMode: boolean = body.batchMode ?? true;

    // Validate sourceIds if provided
    if (sourceIds && !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: 'sourceIds must be an array' },
        { status: 400 }
      );
    }

    // Filter to only valid source IDs
    const allSourceIds = [...YOUTUBE_SOURCES, ...BLOG_SOURCES, ...TWITTER_SOURCES].map(s => s.id);
    const validSourceIds = sourceIds?.filter(id => allSourceIds.includes(id));

    if (sourceIds && validSourceIds && validSourceIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid source IDs provided' },
        { status: 400 }
      );
    }

    return fetchAndProcessContent(validSourceIds, useBatchMode);
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
 * @param batchMode - If true, combines all content into single digest (cheaper). Default: true
 */
async function fetchAndProcessContent(sourceIds?: string[], batchMode: boolean = true) {
  try {
    const isSelectiveFetch = sourceIds && sourceIds.length > 0;
    console.log(isSelectiveFetch
      ? `Starting selective content fetch for ${sourceIds.length} source(s)...`
      : 'Starting full content fetch from all sources...'
    );

    // Separate source IDs by type
    const youtubeIds = sourceIds?.filter(id =>
      YOUTUBE_SOURCES.some(s => s.id === id)
    );
    const blogIds = sourceIds?.filter(id =>
      BLOG_SOURCES.some(s => s.id === id)
    );
    const twitterIds = sourceIds?.filter(id =>
      TWITTER_SOURCES.some(s => s.id === id)
    );

    // ============================================
    // STAGE 1: COLLECTION (no AI costs yet)
    // ============================================
    // Fetch content from selected sources in parallel
    // Track which sources failed so we can report them
    let youtubeContent: Awaited<ReturnType<typeof fetchAllYouTubeContent>> = [];
    let blogContent: Awaited<ReturnType<typeof fetchAllBlogContent>> = [];
    let twitterContent: Awaited<ReturnType<typeof fetchAllTwitterContent>> = [];
    const fetchErrors: string[] = [];

    try {
      [youtubeContent, blogContent, twitterContent] = await Promise.all([
        fetchAllYouTubeContent(youtubeIds),
        fetchAllBlogContent(blogIds),
        fetchAllTwitterContent(twitterIds),
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown fetch error';
      fetchErrors.push(errorMsg);
    }

    const allContent = [...youtubeContent, ...blogContent, ...twitterContent];
    console.log(`Fetched ${allContent.length} items (${youtubeContent.length} YouTube, ${blogContent.length} blogs, ${twitterContent.length} Twitter)`);

    // Check if we got content from all SELECTED Twitter sources
    const selectedTwitterSources = twitterIds?.length || TWITTER_SOURCES.length;
    const fetchedTwitterSources = new Set(twitterContent.map(c => c.sourceId)).size;

    if (fetchedTwitterSources < selectedTwitterSources) {
      const missing = selectedTwitterSources - fetchedTwitterSources;
      console.warn(`⚠️ Only fetched from ${fetchedTwitterSources}/${selectedTwitterSources} Twitter sources (${missing} failed)`);

      // Continue with partial data instead of failing completely
      // This allows demos and partial processing when rate limited
      if (fetchedTwitterSources === 0 && twitterContent.length === 0) {
        // Only fail if we got ZERO content from Twitter (complete failure)
        return NextResponse.json({
          success: false,
          error: `Twitter fetch failed completely. This is likely due to rate limits. Wait a minute and try again, or enable TWITTER_DEMO_MODE in config.ts.`,
          fetched: allContent.length,
          processed: 0,
          hint: 'Set TWITTER_DEMO_MODE = true in lib/config.ts to use demo tweets instead.',
        });
      }
      // Otherwise continue with partial results
    }

    if (allContent.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new content found',
        fetched: 0,
        processed: 0,
        sourcesRequested: sourceIds?.length || 'all',
      });
    }

    // ============================================
    // STAGE 2: AI ANALYSIS (only if Stage 1 succeeded)
    // ============================================

    // Process content with AI
    // Batch mode: single combined summary (cost effective)
    // Normal mode: individual summaries per item (more detailed but expensive)
    console.log(`Processing content with AI (batch mode: ${batchMode})...`);

    let processedContent;
    if (batchMode) {
      // Create a single digest combining all tweets
      const digest = await createDailyDigest(allContent);
      processedContent = digest ? [digest] : [];
    } else {
      // Process each item individually with 2 models (more expensive)
      processedContent = await processAllContent(allContent);
    }

    console.log(`Processed into ${processedContent.length} item(s)`);

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


