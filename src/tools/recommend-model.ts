import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllActiveModels, getDataFreshness } from '../db/models.js';
import { recommend } from '../engine/recommendation.js';
import { TASK_TYPES, COMPLEXITY_LEVELS } from '../engine/types.js';
import type { QueryCache } from '../cache.js';

export function registerRecommendModel(server: McpServer, supabase: SupabaseClient, cache?: QueryCache): void {
  server.registerTool(
    'recommend_model',
    {
      description:
        'Get a cost-optimised model recommendation for a specific task. ' +
        'Describe what you need to do and get back the best model with cost estimate, ' +
        'reasoning, and alternatives.',
      inputSchema: {
        task_type: z.enum(TASK_TYPES).describe(
          'The type of task you need a model for',
        ),
        complexity: z.enum(COMPLEXITY_LEVELS).default('medium').describe(
          'Task complexity: low, medium, or high',
        ),
        estimated_input_tokens: z.number().int().positive().optional().describe(
          'Estimated input size in tokens',
        ),
        estimated_output_tokens: z.number().int().positive().optional().describe(
          'Estimated output size in tokens',
        ),
        budget_per_call: z.number().positive().optional().describe(
          'Maximum spend in USD for this single call',
        ),
        requirements: z.object({
          tool_calling: z.boolean().optional().describe('Must support tool/function calling'),
          json_output: z.boolean().optional().describe('Must support structured JSON output'),
          streaming: z.boolean().optional().describe('Must support streaming responses'),
          context_window_min: z.number().int().positive().optional().describe(
            'Minimum context window in tokens',
          ),
          providers_include: z.array(z.string()).optional().describe(
            'Preferred providers, e.g. ["anthropic", "openai"]',
          ),
          providers_exclude: z.array(z.string()).optional().describe(
            'Excluded providers, e.g. ["deepseek"]',
          ),
        }).optional().describe('Additional requirements for the model'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      try {
        // Check cache
        if (cache) {
          const cached = await cache.get('recommend_model', args);
          if (cached) {
            return { content: [{ type: 'text' as const, text: cached }] };
          }
        }

        const models = await getAllActiveModels(supabase);

        if (models.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: 'No models available in database. Run the seed script first: npm run seed',
              }),
            }],
          };
        }

        const dataFreshness = await getDataFreshness(supabase);

        const result = recommend(models, {
          task_type: args.task_type,
          complexity: args.complexity,
          estimated_input_tokens: args.estimated_input_tokens,
          estimated_output_tokens: args.estimated_output_tokens,
          budget_per_call: args.budget_per_call,
          requirements: args.requirements,
        }, dataFreshness);

        const text = JSON.stringify(result, null, 2);

        // Store in cache
        if (cache) {
          await cache.set('recommend_model', args, text);
        }

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              error: `Failed to generate recommendation: ${err instanceof Error ? err.message : String(err)}`,
            }),
          }],
          isError: true,
        };
      }
    },
  );
}
