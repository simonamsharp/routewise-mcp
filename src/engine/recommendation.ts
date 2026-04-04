import type {
  Model,
  RecommendationRequest,
  RecommendationResponse,
  ModelRecommendation,
  Capability,
  QualityTier,
} from './types.js';
import { QUALITY_TIER_SCORES, QUALITY_TIERS } from './types.js';
import { TASK_PROFILES } from './task-profiles.js';

/**
 * Core recommendation engine.
 *
 * Pipeline: filter → score → rank → format
 */
export function recommend(
  models: Model[],
  request: RecommendationRequest,
  dataFreshness: string,
): RecommendationResponse {
  const profile = TASK_PROFILES[request.task_type];
  const weights = profile.complexity_weights[request.complexity];

  const inputTokens = request.estimated_input_tokens ?? profile.default_input_tokens;
  const outputTokens = request.estimated_output_tokens ?? profile.default_output_tokens;

  // ── Step 1: Hard filter ──
  let candidates = models.filter((m) => m.is_active);

  // Required capabilities from task profile
  for (const cap of profile.required_capabilities) {
    candidates = candidates.filter((m) => m.capabilities[cap]);
  }

  // Required capabilities from user request
  if (request.requirements?.tool_calling) {
    candidates = candidates.filter((m) => m.capabilities.tool_calling);
  }
  if (request.requirements?.json_output) {
    candidates = candidates.filter((m) => m.capabilities.json_output);
  }
  if (request.requirements?.streaming) {
    candidates = candidates.filter((m) => m.capabilities.streaming);
  }
  if (request.requirements?.context_window_min) {
    const min = request.requirements.context_window_min;
    candidates = candidates.filter((m) => m.context_length >= min);
  }

  // Provider preferences
  if (request.requirements?.providers_include?.length) {
    const include = request.requirements.providers_include;
    candidates = candidates.filter((m) => include.includes(m.provider));
  }
  if (request.requirements?.providers_exclude?.length) {
    const exclude = request.requirements.providers_exclude;
    candidates = candidates.filter((m) => !exclude.includes(m.provider));
  }

  // Budget filter
  if (request.budget_per_call != null) {
    candidates = candidates.filter((m) => {
      const cost = estimateCost(m, inputTokens, outputTokens);
      return cost <= request.budget_per_call!;
    });
  }

  // Minimum quality tier from task profile
  const minTierIndex = QUALITY_TIERS.indexOf(profile.min_quality_tier);
  candidates = candidates.filter((m) => {
    const modelTierIndex = QUALITY_TIERS.indexOf(m.quality_tier);
    return modelTierIndex <= minTierIndex; // lower index = higher tier
  });

  // ── Handle no candidates ──
  if (candidates.length === 0) {
    return {
      recommended: createFallbackRecommendation(request),
      alternative: null,
      budget_model: null,
      data_freshness: dataFreshness,
      confidence: 'low',
    };
  }

  // ── Step 2: Score ──
  const maxCost = Math.max(...candidates.map((m) => estimateCost(m, inputTokens, outputTokens)));

  const scored = candidates.map((m) => {
    const cost = estimateCost(m, inputTokens, outputTokens);
    const score = computeScore(m, profile.ideal_quality_tier, weights, cost, maxCost, profile.preferred_capabilities);
    return { model: m, cost, score };
  });

  // ── Step 3: Rank ──
  scored.sort((a, b) => b.score - a.score);

  // Top recommendation
  const top = scored[0];
  const recommended = formatRecommendation(top.model, top.cost, top.score, request, 'top');

  // Alternative: next best with a different provider or tier
  const altCandidate = scored.find(
    (s) => s.model.model_id !== top.model.model_id &&
           (s.model.provider !== top.model.provider || s.model.quality_tier !== top.model.quality_tier),
  );
  const alternative = altCandidate
    ? formatRecommendation(altCandidate.model, altCandidate.cost, altCandidate.score, request, 'alternative')
    : null;

  // Budget model: cheapest viable option
  const budgetCandidates = [...scored].sort((a, b) => a.cost - b.cost);
  const budgetCandidate = budgetCandidates.find(
    (s) => s.model.model_id !== top.model.model_id,
  );
  const budget_model = budgetCandidate
    ? formatRecommendation(budgetCandidate.model, budgetCandidate.cost, budgetCandidate.score, request, 'budget')
    : null;

  // Confidence based on how many candidates survived filtering
  const confidence = candidates.length >= 5 ? 'high' : candidates.length >= 2 ? 'medium' : 'low';

  return {
    recommended,
    alternative,
    budget_model,
    data_freshness: dataFreshness,
    confidence,
  };
}

// ── Scoring ──

function computeScore(
  model: Model,
  idealTier: QualityTier,
  weights: { quality: number; cost: number },
  cost: number,
  maxCost: number,
  preferredCapabilities: Capability[],
): number {
  // Quality score: how close is this model's tier to the ideal?
  const modelTierScore = QUALITY_TIER_SCORES[model.quality_tier];
  const idealTierScore = QUALITY_TIER_SCORES[idealTier];
  // No penalty for exceeding ideal tier, penalty for being below
  const qualityScore = modelTierScore >= idealTierScore
    ? 100
    : (modelTierScore / idealTierScore) * 100;

  // Cost score: cheaper = higher score
  const costScore = maxCost > 0
    ? (1 - (cost / maxCost)) * 100
    : 100;

  // Capability bonus: +5 per preferred capability
  const capBonus = preferredCapabilities.reduce(
    (acc, cap) => acc + (model.capabilities[cap] ? 5 : 0),
    0,
  );

  return (weights.quality * qualityScore) + (weights.cost * costScore) + capBonus;
}

// ── Helpers ──

function estimateCost(model: Model, inputTokens: number, outputTokens: number): number {
  return (model.pricing_prompt * inputTokens) + (model.pricing_completion * outputTokens);
}

function formatRecommendation(
  model: Model,
  cost: number,
  score: number,
  request: RecommendationRequest,
  role: 'top' | 'alternative' | 'budget',
): ModelRecommendation {
  const reasoning = generateReasoning(model, cost, request, role);

  return {
    model_id: model.model_id,
    provider: model.provider,
    display_name: model.display_name,
    quality_tier: model.quality_tier,
    cost_estimate_usd: Math.round(cost * 1_000_000) / 1_000_000, // round to 6dp
    input_price_per_mtok: model.pricing_prompt * 1_000_000,
    output_price_per_mtok: model.pricing_completion * 1_000_000,
    context_length: model.context_length,
    capabilities: model.capabilities,
    score: Math.round(score * 100) / 100,
    reasoning,
  };
}

function generateReasoning(
  model: Model,
  cost: number,
  request: RecommendationRequest,
  role: 'top' | 'alternative' | 'budget',
): string {
  const costStr = cost < 0.000001
    ? `<$0.000001`
    : `$${cost.toFixed(6)}`;

  const inputPriceMtok = (model.pricing_prompt * 1_000_000).toFixed(2);
  const outputPriceMtok = (model.pricing_completion * 1_000_000).toFixed(2);

  switch (role) {
    case 'top':
      return (
        `Recommended for ${request.task_type} (${request.complexity} complexity). ` +
        `${model.display_name} is a ${model.quality_tier}-tier model at ` +
        `$${inputPriceMtok}/$${outputPriceMtok} per M tokens (input/output). ` +
        `Estimated cost for this call: ${costStr}.`
      );
    case 'alternative':
      return (
        `Alternative option from ${model.provider}. ${model.display_name} ` +
        `offers ${model.quality_tier}-tier quality at ` +
        `$${inputPriceMtok}/$${outputPriceMtok} per M tokens. ` +
        `Estimated cost: ${costStr}.`
      );
    case 'budget':
      return (
        `Cheapest viable option. ${model.display_name} at ` +
        `$${inputPriceMtok}/$${outputPriceMtok} per M tokens. ` +
        `Estimated cost: ${costStr}. Quality tier: ${model.quality_tier}.`
      );
  }
}

function createFallbackRecommendation(request: RecommendationRequest): ModelRecommendation {
  return {
    model_id: 'none',
    provider: 'none',
    display_name: 'No matching model found',
    quality_tier: 'standard',
    cost_estimate_usd: 0,
    input_price_per_mtok: 0,
    output_price_per_mtok: 0,
    context_length: 0,
    capabilities: { tool_calling: false, json_output: false, streaming: false, vision: false },
    score: 0,
    reasoning:
      `No models matched the requirements for ${request.task_type} ` +
      `with the given constraints. Try relaxing budget, provider, ` +
      `or capability requirements.`,
  };
}
