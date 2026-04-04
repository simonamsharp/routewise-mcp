import type { TaskProfile, TaskType } from './types.js';

/**
 * Task profiles define what matters for each task type.
 *
 * Each profile includes:
 * - Required/preferred capabilities (hard/soft filters)
 * - Quality tier thresholds (minimum acceptable, ideal target)
 * - Default token estimates (used when caller doesn't provide them)
 * - Complexity-dependent weights for quality vs cost trade-off
 */
export const TASK_PROFILES: Record<TaskType, TaskProfile> = {
  reasoning: {
    task_type: 'reasoning',
    description: 'Complex reasoning, multi-step logic, math, analysis',
    required_capabilities: [],
    preferred_capabilities: [],
    min_quality_tier: 'premium',
    ideal_quality_tier: 'frontier',
    default_input_tokens: 1000,
    default_output_tokens: 2000,
    complexity_weights: {
      low: { quality: 0.6, cost: 0.4 },
      medium: { quality: 0.8, cost: 0.2 },
      high: { quality: 0.9, cost: 0.1 },
    },
  },

  code_generation: {
    task_type: 'code_generation',
    description: 'Writing new code, implementing features, algorithms',
    required_capabilities: [],
    preferred_capabilities: ['json_output'],
    min_quality_tier: 'standard',
    ideal_quality_tier: 'frontier',
    default_input_tokens: 800,
    default_output_tokens: 1500,
    complexity_weights: {
      low: { quality: 0.4, cost: 0.6 },
      medium: { quality: 0.7, cost: 0.3 },
      high: { quality: 0.85, cost: 0.15 },
    },
  },

  code_review: {
    task_type: 'code_review',
    description: 'Reviewing code for bugs, style, security issues',
    required_capabilities: [],
    preferred_capabilities: [],
    min_quality_tier: 'standard',
    ideal_quality_tier: 'premium',
    default_input_tokens: 2000,
    default_output_tokens: 800,
    complexity_weights: {
      low: { quality: 0.4, cost: 0.6 },
      medium: { quality: 0.6, cost: 0.4 },
      high: { quality: 0.8, cost: 0.2 },
    },
  },

  chat: {
    task_type: 'chat',
    description: 'General conversational interaction',
    required_capabilities: [],
    preferred_capabilities: ['streaming'],
    min_quality_tier: 'budget',
    ideal_quality_tier: 'standard',
    default_input_tokens: 500,
    default_output_tokens: 500,
    complexity_weights: {
      low: { quality: 0.3, cost: 0.7 },
      medium: { quality: 0.5, cost: 0.5 },
      high: { quality: 0.7, cost: 0.3 },
    },
  },

  summarisation: {
    task_type: 'summarisation',
    description: 'Condensing long text into shorter summaries',
    required_capabilities: [],
    preferred_capabilities: [],
    min_quality_tier: 'budget',
    ideal_quality_tier: 'standard',
    default_input_tokens: 4000,
    default_output_tokens: 500,
    complexity_weights: {
      low: { quality: 0.3, cost: 0.7 },
      medium: { quality: 0.4, cost: 0.6 },
      high: { quality: 0.6, cost: 0.4 },
    },
  },

  translation: {
    task_type: 'translation',
    description: 'Translating text between languages',
    required_capabilities: [],
    preferred_capabilities: [],
    min_quality_tier: 'standard',
    ideal_quality_tier: 'premium',
    default_input_tokens: 1000,
    default_output_tokens: 1200,
    complexity_weights: {
      low: { quality: 0.4, cost: 0.6 },
      medium: { quality: 0.6, cost: 0.4 },
      high: { quality: 0.8, cost: 0.2 },
    },
  },

  data_extraction: {
    task_type: 'data_extraction',
    description: 'Extracting structured data from unstructured text',
    required_capabilities: [],
    preferred_capabilities: ['json_output'],
    min_quality_tier: 'budget',
    ideal_quality_tier: 'standard',
    default_input_tokens: 2000,
    default_output_tokens: 500,
    complexity_weights: {
      low: { quality: 0.3, cost: 0.7 },
      medium: { quality: 0.5, cost: 0.5 },
      high: { quality: 0.7, cost: 0.3 },
    },
  },

  tool_calling: {
    task_type: 'tool_calling',
    description: 'Using function/tool calling capabilities',
    required_capabilities: ['tool_calling'],
    preferred_capabilities: ['json_output'],
    min_quality_tier: 'standard',
    ideal_quality_tier: 'premium',
    default_input_tokens: 800,
    default_output_tokens: 400,
    complexity_weights: {
      low: { quality: 0.4, cost: 0.6 },
      medium: { quality: 0.6, cost: 0.4 },
      high: { quality: 0.8, cost: 0.2 },
    },
  },

  creative_writing: {
    task_type: 'creative_writing',
    description: 'Stories, poetry, marketing copy, creative content',
    required_capabilities: [],
    preferred_capabilities: ['streaming'],
    min_quality_tier: 'standard',
    ideal_quality_tier: 'frontier',
    default_input_tokens: 500,
    default_output_tokens: 2000,
    complexity_weights: {
      low: { quality: 0.5, cost: 0.5 },
      medium: { quality: 0.7, cost: 0.3 },
      high: { quality: 0.85, cost: 0.15 },
    },
  },

  research: {
    task_type: 'research',
    description: 'Deep analysis, literature review, fact-finding',
    required_capabilities: [],
    preferred_capabilities: [],
    min_quality_tier: 'premium',
    ideal_quality_tier: 'frontier',
    default_input_tokens: 2000,
    default_output_tokens: 3000,
    complexity_weights: {
      low: { quality: 0.5, cost: 0.5 },
      medium: { quality: 0.7, cost: 0.3 },
      high: { quality: 0.9, cost: 0.1 },
    },
  },

  classification: {
    task_type: 'classification',
    description: 'Categorising text, sentiment analysis, labelling',
    required_capabilities: [],
    preferred_capabilities: ['json_output'],
    min_quality_tier: 'economy',
    ideal_quality_tier: 'budget',
    default_input_tokens: 500,
    default_output_tokens: 50,
    complexity_weights: {
      low: { quality: 0.2, cost: 0.8 },
      medium: { quality: 0.3, cost: 0.7 },
      high: { quality: 0.5, cost: 0.5 },
    },
  },

  embedding: {
    task_type: 'embedding',
    description: 'Text embedding generation for vector search',
    required_capabilities: [],
    preferred_capabilities: [],
    min_quality_tier: 'economy',
    ideal_quality_tier: 'economy',
    default_input_tokens: 500,
    default_output_tokens: 0,
    complexity_weights: {
      low: { quality: 0.2, cost: 0.8 },
      medium: { quality: 0.3, cost: 0.7 },
      high: { quality: 0.4, cost: 0.6 },
    },
  },

  vision: {
    task_type: 'vision',
    description: 'Image understanding, OCR, visual analysis',
    required_capabilities: ['vision'],
    preferred_capabilities: [],
    min_quality_tier: 'standard',
    ideal_quality_tier: 'frontier',
    default_input_tokens: 1000,
    default_output_tokens: 500,
    complexity_weights: {
      low: { quality: 0.4, cost: 0.6 },
      medium: { quality: 0.6, cost: 0.4 },
      high: { quality: 0.8, cost: 0.2 },
    },
  },
};
