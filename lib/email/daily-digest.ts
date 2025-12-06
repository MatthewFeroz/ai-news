import { Resend } from 'resend';
import { getContents, getModelStats, updateLastEmailSent } from '../services/storage';
import { EMAIL_CONFIG } from '../config';
import type { ProcessedContent, ModelStats } from '../types';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate stats chart as SVG
 */
function generateStatsChart(stats: ModelStats[]): string {
  const sortedStats = [...stats].sort((a, b) => {
    // Sort by win rate
    const aWinRate = a.wins / (a.wins + a.losses + a.ties || 1);
    const bWinRate = b.wins / (b.wins + b.losses + b.ties || 1);
    return bWinRate - aWinRate;
  });
  
  const barHeight = 35;
  const chartWidth = 500;
  const chartHeight = sortedStats.length * barHeight + 40;
  const maxWins = Math.max(...sortedStats.map(s => s.wins + s.ties), 1);
  
  const bars = sortedStats.map((stat, index) => {
    const y = index * barHeight + 30;
    const winWidth = (stat.wins / maxWins) * (chartWidth - 150);
    const tieWidth = (stat.ties / maxWins) * (chartWidth - 150);
    
    return `
      <g transform="translate(0, ${y})">
        <text x="0" y="12" font-size="12" fill="#e5e7eb">${stat.modelName}</text>
        <rect x="140" y="0" width="${winWidth}" height="20" fill="#10b981" rx="3"/>
        <rect x="${140 + winWidth}" y="0" width="${tieWidth}" height="20" fill="#6b7280" rx="3"/>
        <text x="${145 + winWidth + tieWidth}" y="14" font-size="11" fill="#9ca3af">
          ${stat.wins}W / ${stat.ties}T / ${stat.losses}L
        </text>
      </g>
    `;
  }).join('');
  
  return `
    <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1f2937" rx="8"/>
      <text x="10" y="20" font-size="14" font-weight="bold" fill="#f3f4f6">Model Performance</text>
      ${bars}
      <g transform="translate(140, ${chartHeight - 15})">
        <rect x="0" y="0" width="12" height="12" fill="#10b981" rx="2"/>
        <text x="16" y="10" font-size="10" fill="#9ca3af">Wins</text>
        <rect x="60" y="0" width="12" height="12" fill="#6b7280" rx="2"/>
        <text x="76" y="10" font-size="10" fill="#9ca3af">Ties</text>
      </g>
    </svg>
  `;
}

/**
 * Generate comparison section HTML
 */
function generateComparisonHTML(content: ProcessedContent): string {
  if (content.summaries.length < 2) return '';
  
  const [summaryA, summaryB] = content.summaries;
  
  return `
    <div style="background: #1f2937; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #f3f4f6; margin: 0 0 15px 0; font-size: 16px;">
        📊 Today's Comparison: ${content.title.slice(0, 50)}...
      </h3>
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1; background: #111827; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <div style="color: #60a5fa; font-weight: bold; margin-bottom: 10px;">${summaryA.modelName}</div>
          <p style="color: #d1d5db; font-size: 13px; line-height: 1.5; margin: 0;">${summaryA.summary}</p>
          <div style="color: #6b7280; font-size: 11px; margin-top: 10px;">
            ${summaryA.metrics.wordCount} words • Readability: ${summaryA.metrics.readabilityScore} • ${summaryA.metrics.processingTimeMs}ms
          </div>
        </div>
        <div style="flex: 1; background: #111827; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
          <div style="color: #a78bfa; font-weight: bold; margin-bottom: 10px;">${summaryB.modelName}</div>
          <p style="color: #d1d5db; font-size: 13px; line-height: 1.5; margin: 0;">${summaryB.summary}</p>
          <div style="color: #6b7280; font-size: 11px; margin-top: 10px;">
            ${summaryB.metrics.wordCount} words • Readability: ${summaryB.metrics.readabilityScore} • ${summaryB.metrics.processingTimeMs}ms
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate news item HTML
 */
function generateNewsItemHTML(content: ProcessedContent): string {
  const primarySummary = content.summaries[0];
  if (!primarySummary) return '';
  
  const categoryColors: Record<string, string> = {
    research: '#8B5CF6',
    'product-launch': '#10B981',
    tutorial: '#F59E0B',
    opinion: '#EC4899',
    news: '#3B82F6',
    analysis: '#6366F1',
    other: '#6B7280',
  };
  
  return `
    <div style="background: #111827; border-radius: 8px; padding: 16px; margin: 12px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="color: #9ca3af; font-size: 12px;">${content.sourceName}</span>
        <span style="background: ${categoryColors[primarySummary.category] || '#6B7280'}; color: white; font-size: 10px; padding: 2px 8px; border-radius: 10px;">
          ${primarySummary.category}
        </span>
      </div>
      <a href="${content.url}" style="color: #f3f4f6; font-size: 15px; font-weight: 600; text-decoration: none; display: block; margin-bottom: 8px;">
        ${content.title}
      </a>
      <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0;">
        ${primarySummary.summary}
      </p>
      <div style="color: #6b7280; font-size: 11px;">
        ${primarySummary.highlights.slice(0, 2).map(h => `• ${h}`).join('<br/>')}
      </div>
    </div>
  `;
}

/**
 * Generate full email HTML
 */
function generateEmailHTML(contents: ProcessedContent[], stats: ModelStats[]): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Get the most recent content for comparison
  const comparisonContent = contents.find(c => c.summaries.length >= 2);
  
  // Get top 5 news items
  const newsItems = contents.slice(0, 5);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0;">
          <h1 style="color: #f3f4f6; margin: 0; font-size: 24px;">🤖 AI News Digest</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">${today}</p>
        </div>
        
        <!-- Stats Summary -->
        <div style="background: #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #f3f4f6; margin: 0 0 15px 0; font-size: 16px;">📈 Today's Stats</h2>
          <div style="display: flex; justify-content: space-around; text-align: center;">
            <div>
              <div style="color: #10b981; font-size: 28px; font-weight: bold;">${contents.length}</div>
              <div style="color: #6b7280; font-size: 12px;">Articles</div>
            </div>
            <div>
              <div style="color: #3b82f6; font-size: 28px; font-weight: bold;">${stats.length}</div>
              <div style="color: #6b7280; font-size: 12px;">Models</div>
            </div>
            <div>
              <div style="color: #8b5cf6; font-size: 28px; font-weight: bold;">${stats.reduce((sum, s) => sum + s.wins + s.losses + s.ties, 0)}</div>
              <div style="color: #6b7280; font-size: 12px;">Comparisons</div>
            </div>
          </div>
        </div>
        
        <!-- Model Performance Chart -->
        <div style="text-align: center; margin-bottom: 20px;">
          ${generateStatsChart(stats)}
        </div>
        
        <!-- Model Comparison -->
        ${comparisonContent ? generateComparisonHTML(comparisonContent) : ''}
        
        <!-- Top News -->
        <div style="margin-top: 30px;">
          <h2 style="color: #f3f4f6; margin: 0 0 15px 0; font-size: 16px;">📰 Top Stories</h2>
          ${newsItems.map(generateNewsItemHTML).join('')}
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #374151; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            AI News Aggregator • Powered by Vercel AI SDK
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(): Promise<{ success: boolean; error?: string }> {
  try {
    const emailTo = process.env.EMAIL_TO;
    if (!emailTo) {
      return { success: false, error: 'EMAIL_TO not configured' };
    }
    
    // Get recent content (last 24 hours)
    const contents = await getContents();
    const stats = await getModelStats();
    
    // Filter to recent content
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentContents = contents.filter(c => 
      new Date(c.processedAt) > oneDayAgo
    );
    
    if (recentContents.length === 0) {
      console.log('No recent content to send');
      return { success: true, error: 'No recent content' };
    }
    
    const html = generateEmailHTML(recentContents, stats);
    
    const { error } = await resend.emails.send({
      from: EMAIL_CONFIG.fromEmail,
      to: emailTo,
      subject: `${EMAIL_CONFIG.subject} - ${new Date().toLocaleDateString()}`,
      html,
    });
    
    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
    
    await updateLastEmailSent();
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send digest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}


