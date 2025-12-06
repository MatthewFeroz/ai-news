import Redis from 'ioredis';
import type { StorageData, ProcessedContent, ModelComparison, ModelStats, ModelSummary } from '../types';
import { calculateModelStats } from '../ai/metrics';
import { MODEL_POOL } from '../config';

// Redis keys
const KEYS = {
  contents: 'news:contents',
  comparisons: 'news:comparisons',
  metadata: 'news:metadata',
};

// Redis client singleton
let redis: Redis | null = null;

/**
 * Get Redis client (creates singleton)
 */
function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.STORAGE_REDIS_URL;
    
    if (!redisUrl) {
      throw new Error(
        'STORAGE_REDIS_URL environment variable is not configured. ' +
        'Please set it to your Redis connection URL.'
      );
    }
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  
  return redis;
}

/**
 * Get default empty storage data
 */
function getDefaultData(): StorageData {
  return {
    contents: [],
    comparisons: [],
    lastFetchedAt: new Date().toISOString(),
  };
}

/**
 * Read all storage data from Redis
 */
export async function readStorageData(): Promise<StorageData> {
  try {
    const client = getRedis();
    
    const [contentsJson, comparisonsJson, metadataJson] = await Promise.all([
      client.get(KEYS.contents),
      client.get(KEYS.comparisons),
      client.get(KEYS.metadata),
    ]);
    
    const contents: ProcessedContent[] = contentsJson ? JSON.parse(contentsJson) : [];
    const comparisons: ModelComparison[] = comparisonsJson ? JSON.parse(comparisonsJson) : [];
    const metadata = metadataJson ? JSON.parse(metadataJson) : { lastFetchedAt: new Date().toISOString() };
    
    return {
      contents,
      comparisons,
      lastFetchedAt: metadata.lastFetchedAt,
      lastEmailSentAt: metadata.lastEmailSentAt,
    };
  } catch (error) {
    console.error('Failed to read from Redis:', error);
    return getDefaultData();
  }
}

/**
 * Write all storage data to Redis
 */
export async function writeStorageData(data: StorageData): Promise<void> {
  try {
    const client = getRedis();
    
    const metadata = {
      lastFetchedAt: data.lastFetchedAt,
      lastEmailSentAt: data.lastEmailSentAt,
    };
    
    await Promise.all([
      client.set(KEYS.contents, JSON.stringify(data.contents)),
      client.set(KEYS.comparisons, JSON.stringify(data.comparisons)),
      client.set(KEYS.metadata, JSON.stringify(metadata)),
    ]);
  } catch (error) {
    console.error('Failed to write to Redis:', error);
    throw error;
  }
}

/**
 * Add new processed contents (deduplicates by ID)
 * For MVP/test mode: always updates test article with fresh summaries
 */
export async function addContents(newContents: ProcessedContent[]): Promise<void> {
  const data = await readStorageData();
  
  // Create a map of existing content IDs
  const existingIds = new Set(data.contents.map(c => c.rawContentId));
  
  // Filter out duplicates (but allow test article updates)
  const uniqueNew = newContents.filter(c => {
    // Always allow test article to be updated with new summaries
    if (c.rawContentId === 'test-arxiv-2512-04864') {
      // Remove old test article to replace with new one
      data.contents = data.contents.filter(existing => existing.rawContentId !== 'test-arxiv-2512-04864');
      return true;
    }
    return !existingIds.has(c.rawContentId);
  });
  
  console.log(`Adding ${uniqueNew.length} new items (${uniqueNew.map(c => c.summaries.length + ' summaries').join(', ')})`);
  
  // Add new contents at the beginning (most recent first)
  data.contents = [...uniqueNew, ...data.contents];
  
  // Keep only last 100 items to prevent unlimited growth
  data.contents = data.contents.slice(0, 100);
  
  data.lastFetchedAt = new Date().toISOString();
  
  await writeStorageData(data);
}

/**
 * Get all stored contents
 */
export async function getContents(): Promise<ProcessedContent[]> {
  const data = await readStorageData();
  return data.contents;
}

/**
 * Update a rating for a specific summary
 */
export async function updateRating(
  contentId: string,
  summaryId: string,
  score: number
): Promise<void> {
  const data = await readStorageData();
  
  const content = data.contents.find(c => c.id === contentId);
  if (!content) return;
  
  const summary = content.summaries.find(s => s.id === summaryId);
  if (!summary) return;
  
  summary.rating = {
    score,
    ratedAt: new Date().toISOString(),
  };
  
  await writeStorageData(data);
}

/**
 * Record a comparison winner
 */
export async function recordComparison(
  contentId: string,
  modelA: string,
  modelB: string,
  winner: string
): Promise<void> {
  const data = await readStorageData();
  
  data.comparisons.push({
    id: `comparison-${Date.now()}`,
    contentId,
    modelA,
    modelB,
    winner,
    comparedAt: new Date().toISOString(),
  });
  
  // Keep only last 500 comparisons
  data.comparisons = data.comparisons.slice(-500);
  
  await writeStorageData(data);
}

/**
 * Get all comparisons
 */
export async function getComparisons(): Promise<ModelComparison[]> {
  const data = await readStorageData();
  return data.comparisons;
}

/**
 * Calculate stats for all models
 */
export async function getModelStats(): Promise<ModelStats[]> {
  const data = await readStorageData();
  
  // Collect all summaries
  const allSummaries: ModelSummary[] = data.contents.flatMap(c => c.summaries);
  
  // Calculate wins/losses/ties from comparisons
  const winsMap: Record<string, number> = {};
  const lossesMap: Record<string, number> = {};
  const tiesMap: Record<string, number> = {};
  
  for (const comp of data.comparisons) {
    if (comp.winner === 'tie') {
      tiesMap[comp.modelA] = (tiesMap[comp.modelA] || 0) + 1;
      tiesMap[comp.modelB] = (tiesMap[comp.modelB] || 0) + 1;
    } else if (comp.winner === comp.modelA) {
      winsMap[comp.modelA] = (winsMap[comp.modelA] || 0) + 1;
      lossesMap[comp.modelB] = (lossesMap[comp.modelB] || 0) + 1;
    } else if (comp.winner === comp.modelB) {
      winsMap[comp.modelB] = (winsMap[comp.modelB] || 0) + 1;
      lossesMap[comp.modelA] = (lossesMap[comp.modelA] || 0) + 1;
    }
  }
  
  // Calculate stats for each model in the pool
  return MODEL_POOL.map(model => 
    calculateModelStats(
      model.id,
      model.name,
      allSummaries,
      winsMap[model.id] || 0,
      lossesMap[model.id] || 0,
      tiesMap[model.id] || 0
    )
  );
}

/**
 * Update last email sent timestamp
 */
export async function updateLastEmailSent(): Promise<void> {
  const data = await readStorageData();
  data.lastEmailSentAt = new Date().toISOString();
  await writeStorageData(data);
}

/**
 * Get storage metadata
 */
export async function getStorageMetadata(): Promise<{
  lastFetchedAt: string;
  lastEmailSentAt?: string;
  contentCount: number;
  comparisonCount: number;
}> {
  const data = await readStorageData();
  return {
    lastFetchedAt: data.lastFetchedAt,
    lastEmailSentAt: data.lastEmailSentAt,
    contentCount: data.contents.length,
    comparisonCount: data.comparisons.length,
  };
}

/**
 * Clear all data (useful for testing)
 */
export async function clearAllData(): Promise<void> {
  try {
    const client = getRedis();
    await Promise.all([
      client.del(KEYS.contents),
      client.del(KEYS.comparisons),
      client.del(KEYS.metadata),
    ]);
  } catch (error) {
    console.error('Failed to clear Redis data:', error);
    throw error;
  }
}

/**
 * Test Redis connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getRedis();
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}
