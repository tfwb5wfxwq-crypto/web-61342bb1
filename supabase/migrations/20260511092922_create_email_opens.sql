CREATE TABLE IF NOT EXISTS email_opens (
  id BIGSERIAL PRIMARY KEY,
  tracking_id TEXT,
  email_label TEXT,
  ip TEXT,
  user_agent TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_opens_label ON email_opens(email_label);
CREATE INDEX IF NOT EXISTS idx_email_opens_tracking_id ON email_opens(tracking_id);
