/**
 * Benchmark data ingestion pipeline.
 *
 * Fetches benchmark scores from public sources and stores them for
 * quality-tier assignments and model comparisons.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BenchmarkSourceResult {
  source: string;
  entriesProcessed: number;
  entriesStored: number;
  errors: string[];
}

export interface BenchmarkPipelineResult {
  totalStored: number;
  sources: BenchmarkSourceResult[];
}

export async function runBenchmarkPipeline(
  supabase: SupabaseClient,
  knownModelIds: Set<string>,
): Promise<BenchmarkPipelineResult> {
  // TODO: Implement benchmark ingestion
  console.log(`[benchmarks] ${knownModelIds.size} known models, no sources configured yet`);
  return { totalStored: 0, sources: [] };
}
