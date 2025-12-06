import { MODEL_POOL, MODELS_PER_CONTENT } from '../config';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
}

// Track which model pair was used last to ensure rotation
let lastModelPairIndex = -1;

/**
 * Get a pair of models for A/B comparison
 * Rotates through the model pool to ensure variety
 */
export function getModelPair(): [ModelConfig, ModelConfig] {
  if (MODEL_POOL.length < 2) {
    throw new Error('Need at least 2 models in the pool for A/B comparison');
  }
  
  // Calculate next pair index
  const totalPairs = Math.floor(MODEL_POOL.length / MODELS_PER_CONTENT);
  lastModelPairIndex = (lastModelPairIndex + 1) % totalPairs;
  
  // Get models for this pair
  const modelA = MODEL_POOL[lastModelPairIndex * 2 % MODEL_POOL.length];
  const modelB = MODEL_POOL[(lastModelPairIndex * 2 + 1) % MODEL_POOL.length];
  
  return [modelA, modelB];
}

/**
 * Get a random pair of different models
 */
export function getRandomModelPair(): [ModelConfig, ModelConfig] {
  const shuffled = [...MODEL_POOL].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

/**
 * Get all models for full comparison (use sparingly - expensive)
 */
export function getAllModels(): ModelConfig[] {
  return [...MODEL_POOL];
}

/**
 * Get model by ID
 */
export function getModelById(id: string): ModelConfig | undefined {
  return MODEL_POOL.find(m => m.id === id);
}

/**
 * Reset model rotation (useful for testing)
 */
export function resetModelRotation(): void {
  lastModelPairIndex = -1;
}


