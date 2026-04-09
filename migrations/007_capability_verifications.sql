-- Track capability smoke test results per model.
-- Each row records a single verification run for one model + capability.

CREATE TABLE IF NOT EXISTS capability_verifications (
  id              BIGSERIAL PRIMARY KEY,
  model_id        TEXT NOT NULL REFERENCES models(model_id),
  capability      TEXT NOT NULL,               -- 'tool_calling', 'json_output', 'vision'
  verified        BOOLEAN NOT NULL,            -- true = model passed the smoke test
  error_message   TEXT,                        -- null on success; reason on failure
  latency_ms      INTEGER,                     -- round-trip latency of the test call
  tested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_verification_entry UNIQUE (model_id, capability)
);

-- Index for quick lookups when surfacing verification status
CREATE INDEX IF NOT EXISTS idx_cap_verifications_model ON capability_verifications(model_id);

-- Summary view: latest verification status per model
-- (the UNIQUE constraint on model_id+capability means one row per pair)
COMMENT ON TABLE capability_verifications IS
  'Stores the latest capability smoke test result per model+capability pair. '
  'Upserted on each verification run so the row always reflects the most recent test.';
