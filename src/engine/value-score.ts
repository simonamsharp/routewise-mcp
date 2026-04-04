import type { Model } from './types.js';
import { QUALITY_TIER_SCORES } from './types.js';

/**
 * Compute a value score for a model: quality per dollar.
 *
 * Higher = better value. A cheap budget model and an expensive frontier model
 * can have similar value scores if their quality-to-cost ratio is similar.
 *
 * Formula: quality_points / cost_per_1k_tokens
 * Where cost_per_1k_tokens is a blended input+output cost assuming 2:1 input:output ratio.
 */
export function computeValueScore(model: Model): number {
  const qualityPoints = QUALITY_TIER_SCORES[model.quality_tier] ?? 50;

  // Blended cost per 1K tokens (assuming 2:1 input:output ratio)
  const blendedCostPer1K =
    (model.pricing_prompt * 667) +      // ~667 input tokens per 1K total
    (model.pricing_completion * 333);     // ~333 output tokens per 1K total

  if (blendedCostPer1K <= 0) {
    // Free model — assign a moderate value score
    return qualityPoints * 0.5;
  }

  // Scale to readable range: multiply by 1000 so scores are ~0.1 to ~100
  return (qualityPoints / blendedCostPer1K) * 0.001;
}
