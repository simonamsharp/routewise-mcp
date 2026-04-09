-- Add quality_confidence column to models table.
-- Tracks how the quality_tier was determined:
--   'verified'    — hand-curated in known-models.ts
--   'benchmark'   — calibrated using benchmark data
--   'provisional' — price-heuristic fallback only

ALTER TABLE models
  ADD COLUMN IF NOT EXISTS quality_confidence TEXT NOT NULL DEFAULT 'provisional';

-- Backfill existing models: known-model entries are 'verified'
-- (this runs once; future pipeline runs set the value in application code)
CREATE INDEX IF NOT EXISTS idx_models_quality_confidence ON models(quality_confidence);
