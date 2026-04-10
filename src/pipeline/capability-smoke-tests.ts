/**
 * Capability smoke tests.
 *
 * Verifies model capabilities (tool_calling, vision, etc.) by making
 * lightweight test calls through OpenRouter.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SmokeTestResult {
  tested: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export async function runCapabilitySmokeTests(
  supabase: SupabaseClient,
  openrouterApiKey: string,
): Promise<SmokeTestResult> {
  // TODO: Implement capability smoke tests
  console.log('[smoke-tests] Not yet implemented');
  return { tested: 0, passed: 0, failed: 0, skipped: 0, errors: [] };
}
