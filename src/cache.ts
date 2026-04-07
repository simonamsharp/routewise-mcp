/**
 * Cloudflare KV caching layer for hot queries.
 *
 * TTL policy:
 *   - Pricing tools (get_pricing, check_price_changes, estimate_cost, find_cheapest_capable): 15 minutes
 *   - Recommendation tools (recommend_model, compare_models): 1 hour
 */

/** TTL in seconds by tool category */
export const CACHE_TTL = {
  pricing: 15 * 60,        // 15 minutes
  recommendation: 60 * 60, // 1 hour
} as const;

/** Map each tool name to its TTL category */
const TOOL_TTL: Record<string, number> = {
  get_pricing: CACHE_TTL.pricing,
  check_price_changes: CACHE_TTL.pricing,
  estimate_cost: CACHE_TTL.pricing,
  find_cheapest_capable: CACHE_TTL.pricing,
  recommend_model: CACHE_TTL.recommendation,
  compare_models: CACHE_TTL.recommendation,
};

/**
 * Build a deterministic cache key from tool name + args.
 * Keys are kept short — KV keys have a 512-byte limit.
 */
function buildCacheKey(tool: string, args: Record<string, unknown>): string {
  // Sort keys for determinism, strip undefined values
  const normalized = JSON.stringify(args, Object.keys(args).sort());
  return `tool:${tool}:${normalized}`;
}

export class QueryCache {
  constructor(private kv: KVNamespace) {}

  /**
   * Try to get a cached response for a tool invocation.
   * Returns null on cache miss.
   */
  async get(tool: string, args: Record<string, unknown>): Promise<string | null> {
    const key = buildCacheKey(tool, args);
    try {
      return await this.kv.get(key, 'text');
    } catch {
      // KV errors should never break the request — treat as miss
      return null;
    }
  }

  /**
   * Cache a tool response. TTL is determined by tool name.
   */
  async set(tool: string, args: Record<string, unknown>, value: string): Promise<void> {
    const key = buildCacheKey(tool, args);
    const ttl = TOOL_TTL[tool];
    if (!ttl) return; // unknown tool, don't cache
    try {
      await this.kv.put(key, value, { expirationTtl: ttl });
    } catch {
      // Best-effort — don't fail the request if KV write fails
    }
  }
}
