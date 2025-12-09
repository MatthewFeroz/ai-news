import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { RawContent, ProcessedContent, ModelSummary, ContentCategory } from '../types';
import { ALL_SOURCES, MODEL_POOL } from '../config';
import { calculateMetrics } from './metrics';

// Initialize OpenRouter
const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

export interface BatchSummary {
    id: string;
    sourceId: string;
    sourceName: string;
    sourceType: 'twitter' | 'youtube' | 'blog';
    title: string;
    url: string;
    publishedAt: string;
    processedAt: string;
    summaries: ModelSummary[];
    // Original tweet IDs included in this batch
    includedContentIds: string[];
}

/**
 * Batch process multiple content items into a single combined summary
 * This is much more cost-effective than processing each item individually
 * 
 * Cost savings: 10 tweets in 1 call vs 20 calls (2 models each) = 20x reduction
 */
export async function batchProcessContent(
    contents: RawContent[],
    sourceName: string = 'AI News'
): Promise<ProcessedContent | null> {
    if (contents.length === 0) {
        return null;
    }

    // Use the cheapest model for batch processing (DeepSeek V3.2)
    const model = MODEL_POOL.find(m => m.id.includes('deepseek')) || MODEL_POOL[0];

    const startTime = Date.now();

    // Combine all content into a single prompt
    const combinedContent = contents.map((c, i) =>
        `[${i + 1}] @${c.author || 'unknown'}: ${c.content}`
    ).join('\n\n');

    const prompt = `You are summarizing ${contents.length} tweets/posts from AI companies and researchers.

Here are the posts:
${combinedContent}

Create a combined summary that captures the key announcements, insights, and themes.
Return ONLY a JSON object (no markdown code blocks):

{"summary": "2-4 sentence summary of the main themes and announcements (max 500 chars)", "highlights": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"], "category": "news"}

Valid categories: research, product-launch, tutorial, opinion, news, analysis, other`;

    try {
        const { text } = await generateText({
            model: openrouter(model.id),
            prompt,
        });

        const processingTime = Date.now() - startTime;

        // Parse response
        let jsonStr = text.trim();
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '');
        jsonStr = jsonStr.replace(/\n?\s*```\s*$/i, '');

        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const response = JSON.parse(jsonStr);
        const metrics = calculateMetrics(response.summary, response.highlights, processingTime);

        // Create a single ProcessedContent that represents the batch
        const now = new Date().toISOString();
        const batchId = `batch-${Date.now()}`;

        const summary: ModelSummary = {
            id: `summary-batch-${model.id}-${Date.now()}`,
            modelId: model.id,
            modelName: model.name,
            summary: response.summary,
            highlights: response.highlights,
            category: response.category as ContentCategory,
            metrics,
        };

        // Use the most recent content's timestamp
        const mostRecent = contents.reduce((latest, c) =>
            new Date(c.publishedAt) > new Date(latest.publishedAt) ? c : latest
        );

        return {
            id: batchId,
            rawContentId: batchId,
            sourceId: 'batch-summary',
            sourceName: `${sourceName} Daily Digest`,
            sourceType: 'twitter',
            title: `AI News Digest - ${contents.length} posts from ${new Date().toLocaleDateString()}`,
            url: contents[0]?.url || '#',
            publishedAt: mostRecent.publishedAt,
            processedAt: now,
            summaries: [summary],
            // Store original content IDs for reference (can be used later)
            // Note: This is stored in the thumbnail field as a workaround
            // In a full implementation, you'd add a proper field for this
            thumbnail: undefined,
            author: `${contents.length} sources`,
        };
    } catch (error) {
        console.error('Batch processing failed:', error);
        return null;
    }
}

/**
 * Group content by source and batch process each group
 */
export async function batchProcessBySource(contents: RawContent[]): Promise<ProcessedContent[]> {
    // Group by sourceId
    const grouped = contents.reduce((acc, content) => {
        if (!acc[content.sourceId]) {
            acc[content.sourceId] = [];
        }
        acc[content.sourceId].push(content);
        return acc;
    }, {} as Record<string, RawContent[]>);

    const results: ProcessedContent[] = [];

    for (const [sourceId, group] of Object.entries(grouped)) {
        const source = ALL_SOURCES.find(s => s.id === sourceId);
        const result = await batchProcessContent(group, source?.name);
        if (result) {
            results.push(result);
        }
    }

    return results;
}

/**
 * Batch process ALL content into a single daily digest
 * Most cost-effective option - single AI call for all content
 */
export async function createDailyDigest(contents: RawContent[]): Promise<ProcessedContent | null> {
    return batchProcessContent(contents, 'All Sources');
}
