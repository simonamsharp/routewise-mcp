import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPriceChangesSince } from '../db/price-history.js';
import { getDataFreshness } from '../db/models.js';
import type { QueryCache } from '../cache.js';
import type { ToolTracker } from '../observability.js';

export function registerCheckPriceChanges(server: McpServer, supabase: SupabaseClient, cache?: QueryCache, tracker?: ToolTracker): void {
  server.registerTool(
    'check_price_changes',
    {
      description:
        'Returns all LLM pricing changes recorded since a given date, optionally filtered to a specific model or provider. ' +
        'Each change record includes the old price, new price, model ID, and change timestamp. ' +
        'The since parameter accepts ISO date format (YYYY-MM-DD or full ISO timestamp, e.g. "2026-04-01"). ' +
        'Returns an empty changes array when no changes are found in the period. ' +
        'Use to monitor cost drift, detect newly added or deprecated models, or build price-change alerts. ' +
        'Check total_changes in the response to distinguish empty results from errors.',
      inputSchema: {
        since: z.string().describe(
          'ISO date to check changes from, e.g. "2026-04-01"',
        ),
        model_id: z.string().optional().describe(
          'Filter to a specific model',
        ),
        provider: z.string().optional().describe(
          'Filter to a specific provider',
        ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      const startMs = Date.now();
      let cacheHit = false;
      let isError = false;
      try {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}/;
        if (!dateRegex.test(args.since)) {
          isError = true;
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Invalid date format. Use ISO format, e.g. "2026-04-01"',
              }),
            }],
            isError: true,
          };
        }

        // Check cache
        if (cache) {
          const cached = await cache.get('check_price_changes', args);
          if (cached) {
            cacheHit = true;
            return { content: [{ type: 'text' as const, text: cached }] };
          }
        }

        const changes = await getPriceChangesSince(
          supabase,
          args.since,
          args.model_id,
          args.provider,
        );

        const dataFreshness = await getDataFreshness(supabase);

        const result = {
          changes,
          total_changes: changes.length,
          since: args.since,
          data_freshness: dataFreshness,
        };

        const text = JSON.stringify(result, null, 2);

        // Store in cache
        if (cache) {
          await cache.set('check_price_changes', args, text);
        }

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        isError = true;
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              error: `Failed to check price changes: ${err instanceof Error ? err.message : String(err)}`,
            }),
          }],
          isError: true,
        };
      } finally {
        tracker?.record('check_price_changes', {
          latency_ms: Date.now() - startMs,
          error: isError,
          cache_hit: cacheHit,
        }).catch(() => {});
      }
    },
  );
}
