-- Migration: Add price discrepancy logging table
-- Records when OpenRouter and provider-direct prices disagree by more than a threshold.

CREATE TABLE IF NOT EXISTS price_discrepancies (
  id BIGSERIAL PRIMARY KEY,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  field_compared TEXT NOT NULL,             -- 'pricing_prompt' or 'pricing_completion'
  openrouter_value DOUBLE PRECISION NOT NULL,
  provider_direct_value DOUBLE PRECISION NOT NULL,
  provider_source TEXT NOT NULL,            -- e.g. 'anthropic_api', 'openai_api'
  discrepancy_pct DOUBLE PRECISION NOT NULL,
  resolution TEXT NOT NULL DEFAULT 'prefer_provider', -- 'prefer_provider' | 'prefer_openrouter' | 'manual'
  resolved_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_discrepancies_model_id ON price_discrepancies(model_id);
CREATE INDEX IF NOT EXISTS idx_price_discrepancies_detected_at ON price_discrepancies(detected_at);
