import { NextResponse } from 'next/server';
import { fetchAllYouTubeContent } from '@/lib/services/youtube';
import { fetchAllBlogContent } from '@/lib/services/blogs';
import { processAllContent } from '@/lib/ai/process';
import { addContents } from '@/lib/services/storage';

// Vercel Cron configuration
export const maxDuration = 60; // Allow up to 60 seconds for processing
export const dynamic = 'force-dynamic';

/**
 * POST /api/cron
 * Fetches new content from all sources, processes with AI, and stores
 * Called by Vercel Cron or manually
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

  try {
    console.log('Starting content fetch...');
    
    // Fetch content from all sources in parallel
    const [youtubeContent, blogContent] = await Promise.all([
      fetchAllYouTubeContent(),
      fetchAllBlogContent(),
    ]);
    
    const allContent = [...youtubeContent, ...blogContent];
    console.log(`Fetched ${allContent.length} items (${youtubeContent.length} YouTube, ${blogContent.length} blogs)`);
    
    if (allContent.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new content found',
        fetched: 0,
        processed: 0,
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

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}


