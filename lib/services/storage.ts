import { promises as fs } from 'fs';
import path from 'path';
import type { StorageData, ProcessedContent, ModelComparison, ModelStats, ModelSummary } from '../types';
import { calculateModelStats } from '../ai/metrics';
import { MODEL_POOL } from '../config';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'news-data.json');

/**
 * Ensure data directory exists
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
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
 * Read storage data from file
 */
export async function readStorageData(): Promise<StorageData> {
  await ensureDataDir();
  
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data) as StorageData;
  } catch {
    // File doesn't exist or is invalid
    return getDefaultData();
  }
}

/**
 * Write storage data to file
 */
export async function writeStorageData(data: StorageData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Add new processed contents (deduplicates by ID)
 */
export async function addContents(newContents: ProcessedContent[]): Promise<void> {
  const data = await readStorageData();
  
  // Create a map of existing content IDs
  const existingIds = new Set(data.contents.map(c => c.rawContentId));
  
  // Filter out duplicates
  const uniqueNew = newContents.filter(c => !existingIds.has(c.rawContentId));
  
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


