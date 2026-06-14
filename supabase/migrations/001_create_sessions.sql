CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'in_discovery',
  metadata      JSONB NOT NULL DEFAULT '{}',
  structured_brief JSONB NOT NULL DEFAULT '{}',
  coverage      JSONB NOT NULL DEFAULT '{"productContext":0,"functional":0,"aesthetics":0}',
  chat_history  JSONB NOT NULL DEFAULT '[]',
  contradictions JSONB NOT NULL DEFAULT '[]',
  assumptions   JSONB NOT NULL DEFAULT '[]',
  open_questions JSONB NOT NULL DEFAULT '[]',
  recap_history JSONB NOT NULL DEFAULT '[]',
  out_of_scope_topics JSONB NOT NULL DEFAULT '[]',
  brief_markdown TEXT NOT NULL DEFAULT '',
  llm_reasoning TEXT NOT NULL DEFAULT '',
  uploaded_images JSONB NOT NULL DEFAULT '[]',
  fetched_websites JSONB NOT NULL DEFAULT '[]',
  last_recap_turn INTEGER NOT NULL DEFAULT 0,
  shareable_url TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_all ON sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
