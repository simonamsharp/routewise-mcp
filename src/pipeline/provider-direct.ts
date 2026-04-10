/**
 * Provider-direct price ingestion.
 *
 * Fetches pricing data directly from provider APIs (e.g. Anthropic, OpenAI)
 * as a secondary source to cross-reference OpenRouter prices.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProviderSourceResult {
  source: string;
  modelsProcessed: number;
  pricesStored: number;
  errors: string[];
}

export interface ProviderDirectResult {
  totalStored: number;
  sources: ProviderSourceResult[];
}

export async function runProviderDirectIngestion(
  supabase: SupabaseClient,
): Promise<ProviderDirectResult> {
  // TODO: Implement provider-direct price fetching
  console.log('[provider-direct] No sources configured yet');
  return { totalStored: 0, sources: [] };
}
