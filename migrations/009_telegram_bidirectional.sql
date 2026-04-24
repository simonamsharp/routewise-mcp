-- Telegram bidirectional: thread continuity + Paperclip user binding

-- ── Thread continuity: maps Telegram messages to Paperclip issues ──
CREATE TABLE IF NOT EXISTS telegram_threads (
  id                          BIGSERIAL PRIMARY KEY,
  telegram_chat_id            BIGINT NOT NULL,
  telegram_message_id         BIGINT NOT NULL,  -- bot's confirmation message ID (for reply threading)
  paperclip_issue_id          TEXT NOT NULL,
  paperclip_issue_identifier  TEXT NOT NULL,    -- e.g. "WHIA-123"
  agent_name                  TEXT NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_telegram_thread UNIQUE (telegram_chat_id, telegram_message_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_threads_chat ON telegram_threads(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_threads_issue ON telegram_threads(paperclip_issue_id);

-- ── Extend telegram_users with Paperclip binding + polling cursor ──
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS paperclip_user_id         TEXT,
  ADD COLUMN IF NOT EXISTS paperclip_last_comment_id TEXT;  -- cursor: last comment pushed to Telegram

-- ── RLS for new table ──
ALTER TABLE telegram_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all on telegram_threads"
  ON telegram_threads FOR ALL TO service_role USING (true) WITH CHECK (true);
