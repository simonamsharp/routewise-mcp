-- Migration: Add deprecation and EOL tracking for models
-- Tracks model lifecycle status so stale models stop appearing in recommendations.

-- Add availability status: active (default), deprecated, sunset
ALTER TABLE models
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'active';

-- Track how many consecutive pipeline runs a model has been absent from OpenRouter
ALTER TABLE models
  ADD COLUMN IF NOT EXISTS consecutive_missing_runs INTEGER NOT NULL DEFAULT 0;

-- Timestamp when the model was first marked deprecated
ALTER TABLE models
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ;

-- Index for filtering by availability status
CREATE INDEX IF NOT EXISTS idx_models_availability_status ON models(availability_status);

-- Update existing deprecated check constraint (if any) or add one
ALTER TABLE models
  ADD CONSTRAINT chk_availability_status
  CHECK (availability_status IN ('active', 'deprecated', 'sunset'));
