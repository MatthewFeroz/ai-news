import { NextResponse } from 'next/server';
import { sendDailyDigest } from '@/lib/email/daily-digest';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/email
 * Sends the daily digest email
 * Called by Vercel Cron or manually
 */
export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    console.log('Sending daily digest email...');
    
    const result = await sendDailyDigest();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Daily digest sent successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email cron job failed:', error);
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


