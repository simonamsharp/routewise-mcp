-- Benchmark scores for models from external sources (LMSYS, Artificial Analysis, etc.)

CREATE TABLE IF NOT EXISTS benchmarks (
  id              BIGSERIAL PRIMARY KEY,
  model_id        TEXT NOT NULL REFERENCES models(model_id) ON DELETE CASCADE,
  source          TEXT NOT NULL,           -- e.g. 'lmsys_chatbot_arena', 'artificial_analysis'
  benchmark_name  TEXT NOT NULL,           -- e.g. 'chatbot_arena_elo', 'mmlu', 'humaneval'
  score           DOUBLE PRECISION NOT NULL,
  max_score       DOUBLE PRECISION,        -- max possible score for normalization (e.g. 100 for MMLU)
  rank            INTEGER,                 -- rank within the benchmark leaderboard
  metadata        JSONB DEFAULT '{}',      -- extra benchmark-specific data
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_benchmark_entry UNIQUE (model_id, source, benchmark_name)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_model ON benchmarks(model_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_source ON benchmarks(source);
CREATE INDEX IF NOT EXISTS idx_benchmarks_name ON benchmarks(benchmark_name);
CREATE INDEX IF NOT EXISTS idx_benchmarks_score ON benchmarks(score DESC);

-- RLS policies
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read benchmarks" ON benchmarks;
CREATE POLICY "Allow anon read benchmarks"
  ON benchmarks FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow service role all on benchmarks" ON benchmarks;
CREATE POLICY "Allow service role all on benchmarks"
  ON benchmarks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE TRIGGER benchmarks_updated_at
  BEFORE UPDATE ON benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
