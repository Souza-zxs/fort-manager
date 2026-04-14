-- ============================================================
-- Fort Manager — Tabela de sync_state
-- Armazena timestamps de sincronização por integração
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_state (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id      UUID          NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  entity_type         TEXT          NOT NULL,  -- 'orders', 'payments', 'items'
  last_sync_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (integration_id, entity_type)
);

CREATE INDEX IF NOT EXISTS sync_state_integration_id_idx ON sync_state (integration_id);

ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

-- Webhook events table - stores received webhook notifications
CREATE TABLE IF NOT EXISTS webhook_events (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id      UUID          NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  topic               TEXT          NOT NULL,
  resource_id         TEXT          NOT NULL,
  resource_url        TEXT          NOT NULL,
  processed           BOOLEAN        NOT NULL DEFAULT false,
  processing_error    TEXT,
  received_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_integration_id_idx ON webhook_events (integration_id);
CREATE INDEX IF NOT EXISTS webhook_events_topic_idx ON webhook_events (topic);
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON webhook_events (processed);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events: usuário lê via integração" ON webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = webhook_events.integration_id
        AND integrations.user_id = auth.uid()
    )
  );