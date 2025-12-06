import { NextResponse } from 'next/server';
import { updateRating, recordComparison } from '@/lib/services/storage';
import { z } from 'zod';

// Schema for rating a single summary
const ratingSchema = z.object({
  contentId: z.string(),
  summaryId: z.string(),
  score: z.number().min(1).max(5),
});

// Schema for recording a comparison winner
const comparisonSchema = z.object({
  contentId: z.string(),
  modelA: z.string(),
  modelB: z.string(),
  winner: z.string(), // modelId or 'tie'
});

/**
 * POST /api/ratings
 * Submit a rating for a summary or record a comparison winner
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Try to parse as rating first
    const ratingResult = ratingSchema.safeParse(body);
    if (ratingResult.success) {
      const { contentId, summaryId, score } = ratingResult.data;
      await updateRating(contentId, summaryId, score);
      
      return NextResponse.json({
        success: true,
        type: 'rating',
        message: 'Rating saved',
      });
    }
    
    // Try to parse as comparison
    const comparisonResult = comparisonSchema.safeParse(body);
    if (comparisonResult.success) {
      const { contentId, modelA, modelB, winner } = comparisonResult.data;
      await recordComparison(contentId, modelA, modelB, winner);
      
      return NextResponse.json({
        success: true,
        type: 'comparison',
        message: 'Comparison recorded',
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to save rating:', error);
    return NextResponse.json(
      { error: 'Failed to save rating' },
      { status: 500 }
    );
  }
}


