import { NextResponse } from 'next/server';
import { getContents, getModelStats, getStorageMetadata } from '@/lib/services/storage';
import type { NewsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/news
 * Returns all processed news content with model stats
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const source = searchParams.get('source');
    const type = searchParams.get('type'); // 'youtube', 'blog', or 'twitter'
    
    // Get all content and stats
    let contents = await getContents();
    const stats = await getModelStats();
    const metadata = await getStorageMetadata();
    
    // Apply filters
    if (category) {
      contents = contents.filter(c => 
        c.summaries.some(s => s.category === category)
      );
    }
    
    if (source) {
      contents = contents.filter(c => c.sourceId === source);
    }
    
    if (type === 'youtube' || type === 'blog' || type === 'twitter') {
      contents = contents.filter(c => c.sourceType === type);
    }
    
    const response: NewsResponse = {
      contents,
      stats,
      lastUpdated: metadata.lastFetchedAt,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get news:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve news' },
      { status: 500 }
    );
  }
}


