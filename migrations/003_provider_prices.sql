-- Migration: Add provider-direct pricing table
-- Stores prices fetched directly from provider APIs (Anthropic, OpenAI, etc.)
-- alongside the existing OpenRouter-sourced prices in the models table.

CREATE TABLE IF NOT EXISTS provider_prices (
  id BIGSERIAL PRIMARY KEY,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  source TEXT NOT NULL,                     -- e.g. 'anthropic_api', 'openai_api'
  pricing_prompt DOUBLE PRECISION NOT NULL, -- USD per token (input)
  pricing_completion DOUBLE PRECISION NOT NULL, -- USD per token (output)
  pricing_image DOUBLE PRECISION,
  pricing_request DOUBLE PRECISION,
  raw_model_id TEXT,                        -- the provider's native model ID
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_provider_prices_model_source UNIQUE (model_id, source)
);

-- Index for quick lookups by model
CREATE INDEX IF NOT EXISTS idx_provider_prices_model_id ON provider_prices(model_id);

-- Index for source-based queries
CREATE INDEX IF NOT EXISTS idx_provider_prices_source ON provider_prices(source);
