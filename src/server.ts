import type { SupabaseClient } from '@supabase/supabase-js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerRecommendModel } from './tools/recommend-model.js';
import { registerCompareModels } from './tools/compare-models.js';
import { registerGetPricing } from './tools/get-pricing.js';
import { registerCheckPriceChanges } from './tools/check-price-changes.js';
import { registerEstimateCost } from './tools/estimate-cost.js';
import { registerFindCheapestCapable } from './tools/find-cheapest-capable.js';
import type { QueryCache } from './cache.js';

/**
 * Create a new McpServer instance with all tools registered.
 * Each session gets its own server instance (per SDK pattern).
 *
 * When a QueryCache is provided, tool responses are cached in Cloudflare KV
 * with TTLs appropriate to each tool category.
 */
export function createWhichModelServer(supabase: SupabaseClient, cache?: QueryCache): McpServer {
  const server = new McpServer({
    name: 'whichmodel',
    version: '0.1.0',
  });

  registerRecommendModel(server, supabase, cache);
  registerCompareModels(server, supabase, cache);
  registerGetPricing(server, supabase, cache);
  registerCheckPriceChanges(server, supabase, cache);
  registerEstimateCost(server, supabase, cache);
  registerFindCheapestCapable(server, supabase, cache);

  return server;
}
