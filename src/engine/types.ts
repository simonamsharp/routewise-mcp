// ── Task types that agents can request recommendations for ──

export const TASK_TYPES = [
  'chat',
  'code_generation',
  'code_review',
  'summarisation',
  'translation',
  'data_extraction',
  'tool_calling',
  'creative_writing',
  'research',
  'classification',
  'embedding',
  'vision',
  'reasoning',
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

// ── Quality tiers ──

export const QUALITY_TIERS = ['frontier', 'premium', 'standard', 'budget', 'economy'] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];

export const QUALITY_TIER_SCORES: Record<QualityTier, number> = {
  frontier: 100,
  premium: 75,
  standard: 50,
  budget: 25,
  economy: 10,
};

// ── Model capabilities ──

export const CAPABILITIES = ['tool_calling', 'json_output', 'streaming', 'vision'] as const;
export type Capability = (typeof CAPABILITIES)[number];

// ── Complexity levels ──

export const COMPLEXITY_LEVELS = ['low', 'medium', 'high'] as const;
export type Complexity = (typeof COMPLEXITY_LEVELS)[number];

// ── Model as stored in Supabase ──

export interface Model {
  model_id: string;
  provider: string;
  display_name: string;
  description: string | null;
  context_length: number;
  max_output_tokens: number | null;
  modality: string;
  pricing_prompt: number;      // USD per token
  pricing_completion: number;  // USD per token
  pricing_image: number | null;
  pricing_request: number | null;
  capabilities: ModelCapabilities;
  supported_parameters: string[];
  quality_tier: QualityTier;
  quality_confidence: 'verified' | 'provisional' | null;
  value_score: number | null;
  is_active: boolean;
  availability_status: 'active' | 'deprecated' | 'sunset';
  deprecated_at: string | null;
  consecutive_missing_runs: number;
  created_at: string;
  updated_at: string;
}

export interface ModelCapabilities {
  tool_calling: boolean;
  json_output: boolean;
  streaming: boolean;
  vision: boolean;
}

// ── Price history entry ──

export interface PriceHistoryEntry {
  id?: number;
  model_id: string;
  field_changed: string;
  old_value: number;
  new_value: number;
  change_pct: number;
  detected_at: string;
}

// ── Recommendation request / response ──

export interface RecommendationRequest {
  task_type: TaskType;
  complexity: Complexity;
  estimated_input_tokens?: number;
  estimated_output_tokens?: number;
  budget_per_call?: number;
  requirements?: {
    tool_calling?: boolean;
    json_output?: boolean;
    streaming?: boolean;
    context_window_min?: number;
    providers_include?: string[];
    providers_exclude?: string[];
  };
}

export interface ModelRecommendation {
  model_id: string;
  provider: string;
  display_name: string;
  quality_tier: QualityTier;
  cost_estimate_usd: number;
  input_price_per_mtok: number;
  output_price_per_mtok: number;
  context_length: number;
  capabilities: ModelCapabilities;
  score: number;
  reasoning: string;
}

export interface RecommendationResponse {
  recommended: ModelRecommendation;
  alternative: ModelRecommendation | null;
  budget_model: ModelRecommendation | null;
  data_freshness: string;
  confidence: 'high' | 'medium' | 'low';
}

// ── Comparison types ──

export interface ModelComparison {
  model_id: string;
  provider: string;
  display_name: string;
  input_price_per_mtok: number;
  output_price_per_mtok: number;
  daily_cost_estimate: number | null;
  monthly_cost_estimate: number | null;
  context_length: number;
  capabilities: ModelCapabilities;
  quality_tier: QualityTier;
  quality_confidence: 'verified' | 'provisional' | null;
  value_score: number | null;
}

export interface CompareRequest {
  model_ids: string[];
  task_type?: TaskType;
  volume?: {
    calls_per_day: number;
    avg_input_tokens: number;
    avg_output_tokens: number;
  };
}

// ── Pricing filter types ──

export interface PricingFilter {
  model_id?: string;
  provider?: string;
  max_input_price?: number;
  capabilities?: Capability[];
  min_context_window?: number;
  include_deprecated?: boolean;
  limit?: number;
}

// ── Price change types ──

export interface PriceChange {
  model_id: string;
  change_type: 'price_decrease' | 'price_increase' | 'new_model' | 'deprecated';
  old_input_price: number | null;
  new_input_price: number | null;
  old_output_price: number | null;
  new_output_price: number | null;
  percent_change: number | null;
  detected_at: string;
  note: string;
}

// ── Task profile for recommendation engine ──

export interface TaskProfile {
  task_type: TaskType;
  description: string;
  required_capabilities: Capability[];
  preferred_capabilities: Capability[];
  min_quality_tier: QualityTier;
  ideal_quality_tier: QualityTier;
  default_input_tokens: number;
  default_output_tokens: number;
  complexity_weights: Record<Complexity, { quality: number; cost: number }>;
}

// ── OpenRouter API response shape ──

export interface OpenRouterModel {
  id: string;
  name: string;
  created?: number;
  description?: string;
  context_length: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
}
