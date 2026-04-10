/**
 * Benchmark data access layer.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BenchmarkEntry {
  model_id: string;
  benchmark_name: string;
  score: number;
  source: string;
  measured_at: string;
}

export interface BenchmarkSummary {
  entries: BenchmarkEntry[];
  avg_score: number;
}

/**
 * Fetch benchmark entries for a list of model IDs.
 */
export async function getBenchmarksForModels(
  supabase: SupabaseClient,
  modelIds: string[],
): Promise<Map<string, BenchmarkEntry[]>> {
  const result = new Map<string, BenchmarkEntry[]>();

  if (modelIds.length === 0) return result;

  const { data, error } = await supabase
    .from('benchmarks')
    .select('*')
    .in('model_id', modelIds);

  if (error) {
    console.warn(`Failed to fetch benchmarks: ${error.message}`);
    return result;
  }

  for (const row of data ?? []) {
    const entry: BenchmarkEntry = {
      model_id: row.model_id as string,
      benchmark_name: row.benchmark_name as string,
      score: row.score as number,
      source: row.source as string,
      measured_at: row.measured_at as string,
    };
    const list = result.get(entry.model_id) ?? [];
    list.push(entry);
    result.set(entry.model_id, list);
  }

  return result;
}

/**
 * Build a summary from benchmark entries.
 */
export function buildBenchmarkSummary(entries: BenchmarkEntry[]): BenchmarkSummary {
  const avg_score = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.score, 0) / entries.length
    : 0;
  return { entries, avg_score };
}
