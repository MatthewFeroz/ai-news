import { generateText } from 'ai';
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

// Zod schema for AI response with length limits
const summarySchema = z.object({
  summary: z.string().max(300).describe('A concise 2-3 sentence summary, max 300 characters'),
  highlights: z.array(z.string().max(100)).max(5).describe('3-5 short takeaways, each max 100 characters'),
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
  
  // Combine title and content for better context
  const fullContent = `${content.title}\n\n${content.content}`;
  
  // Skip if combined content is still too short (less than 50 chars)
  if (fullContent.length < 50) {
    console.log(`Skipping "${content.title}" - content too short (${fullContent.length} chars)`);
    return null;
  }
  
  try {
    const { text } = await generateText({
      model: openrouter(model.id),
      prompt: `Summarize this news article. Return ONLY a JSON object, no markdown.

${fullContent.slice(0, 10000)}

Return this exact JSON structure (no code blocks, no explanation):
{"summary": "2-3 sentence summary (max 300 chars)", "highlights": ["point 1", "point 2", "point 3"], "category": "research"}

Valid categories: research, product-launch, tutorial, opinion, news, analysis, other`,
    });
    
    const processingTime = Date.now() - startTime;
    
    // Strip markdown code blocks if present (handles various formats)
    let jsonStr = text.trim();
    
    // Remove ```json or ``` at start
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '');
    // Remove ``` at end (with possible whitespace)
    jsonStr = jsonStr.replace(/\n?\s*```\s*$/i, '');
    
    // Also try to extract JSON if there's other text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    console.log(`${model.name} response (cleaned):`, jsonStr.substring(0, 100) + '...');
    
    // Parse JSON
    const response = JSON.parse(jsonStr) as AISummaryResponse;
    
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


