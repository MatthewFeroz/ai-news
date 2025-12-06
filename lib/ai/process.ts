import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import type { RawContent, ProcessedContent, ModelSummary, AISummaryResponse, ContentCategory } from '../types';
import { ALL_SOURCES } from '../config';
import { getRandomModelPair, type ModelConfig } from './models';
import { calculateMetrics } from './metrics';

// Initialize OpenRouter
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Zod schema for AI response
const summarySchema = z.object({
  summary: z.string().describe('A concise 2-3 sentence summary of the content'),
  highlights: z.array(z.string()).describe('3-5 key takeaways or highlights'),
  category: z.enum([
    'research',
    'product-launch', 
    'tutorial',
    'opinion',
    'news',
    'analysis',
    'other'
  ]).describe('The best category for this content'),
});

/**
 * Generate a summary using a specific model
 */
async function generateSummaryWithModel(
  content: RawContent,
  model: ModelConfig
): Promise<ModelSummary | null> {
  const startTime = Date.now();
  
  try {
    const { object } = await generateObject({
      model: openrouter(model.id),
      schema: summarySchema,
      prompt: `Analyze and summarize the following content from "${content.title}":

${content.content}

Provide:
1. A concise 2-3 sentence summary
2. 3-5 key highlights or takeaways (as bullet points)
3. The best category for this content`,
    });
    
    const processingTime = Date.now() - startTime;
    const response = object as AISummaryResponse;
    
    // Calculate metrics for this summary
    const metrics = calculateMetrics(response.summary, response.highlights, processingTime);
    
    return {
      id: `summary-${model.id}-${Date.now()}`,
      modelId: model.id,
      modelName: model.name,
      summary: response.summary,
      highlights: response.highlights,
      category: response.category as ContentCategory,
      metrics,
    };
  } catch (error) {
    console.error(`Failed to generate summary with ${model.name}:`, error);
    return null;
  }
}

/**
 * Process a single content item with multiple models for A/B comparison
 */
export async function processContent(content: RawContent): Promise<ProcessedContent | null> {
  const [modelA, modelB] = getRandomModelPair();
  
  // Generate summaries with both models in parallel
  const [summaryA, summaryB] = await Promise.all([
    generateSummaryWithModel(content, modelA),
    generateSummaryWithModel(content, modelB),
  ]);
  
  const summaries = [summaryA, summaryB].filter((s): s is ModelSummary => s !== null);
  
  if (summaries.length === 0) {
    console.error(`Failed to generate any summaries for: ${content.title}`);
    return null;
  }
  
  const source = ALL_SOURCES.find(s => s.id === content.sourceId);
  
  return {
    id: `processed-${content.id}`,
    rawContentId: content.id,
    sourceId: content.sourceId,
    sourceName: source?.name || 'Unknown',
    sourceType: source?.type || 'blog',
    title: content.title,
    url: content.url,
    publishedAt: content.publishedAt,
    thumbnail: content.thumbnail,
    author: content.author,
    processedAt: new Date().toISOString(),
    summaries,
  };
}

/**
 * Process multiple content items
 */
export async function processAllContent(contents: RawContent[]): Promise<ProcessedContent[]> {
  const results: ProcessedContent[] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 3;
  
  for (let i = 0; i < contents.length; i += batchSize) {
    const batch = contents.slice(i, i + batchSize);
    
    const processed = await Promise.all(
      batch.map(content => processContent(content))
    );
    
    results.push(...processed.filter((p): p is ProcessedContent => p !== null));
    
    // Small delay between batches
    if (i + batchSize < contents.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}


