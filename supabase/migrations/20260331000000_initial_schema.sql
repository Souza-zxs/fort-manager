-- ============================================================
-- Fort Manager — Schema inicial
-- Gerado a partir das tipagens TypeScript em:
--   src/api/marketplaces/infra/database/supabase.ts
-- ============================================================

-- Habilita a extensão pgcrypto para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Função utilitária para atualizar updated_at automaticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABELA: integrations
-- Armazena as conexões com marketplaces (Shopee, ML, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace               TEXT        NOT NULL,
  shop_id                   TEXT        NOT NULL,
  shop_name                 TEXT        NOT NULL DEFAULT '',
  access_token              TEXT        NOT NULL DEFAULT '',
  refresh_token             TEXT        NOT NULL DEFAULT '',
  access_token_expires_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  refresh_token_expires_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active                 BOOLEAN     NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, marketplace, shop_id)
);

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations: usuário lê as próprias" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "integrations: usuário insere as próprias" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "integrations: usuário atualiza as próprias" ON integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "integrations: usuário deleta as próprias" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: orders
-- Pedidos sincronizados dos marketplaces
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id      UUID          NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  external_order_id   TEXT          NOT NULL,
  status              TEXT          NOT NULL,
  total_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency            TEXT          NOT NULL DEFAULT 'BRL',
  buyer_username      TEXT          NOT NULL DEFAULT '',
  shipping_carrier    TEXT          NOT NULL DEFAULT '',
  tracking_number     TEXT          NOT NULL DEFAULT '',
  paid_at             TIMESTAMPTZ,
  order_created_at    TIMESTAMPTZ   NOT NULL,
  order_updated_at    TIMESTAMPTZ   NOT NULL,
  synced_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (integration_id, external_order_id)
);

CREATE INDEX IF NOT EXISTS orders_integration_id_idx ON orders (integration_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_order_created_at_idx ON orders (order_created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders: usuário lê via integração" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = orders.integration_id
        AND integrations.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABELA: order_items
-- Itens de cada pedido
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  external_item_id  TEXT          NOT NULL,
  item_name         TEXT          NOT NULL DEFAULT '',
  sku               TEXT          NOT NULL DEFAULT '',
  quantity          INTEGER       NOT NULL DEFAULT 1,
  unit_price        NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_price       NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (order_id, external_item_id)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items: usuário lê via pedido" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN integrations ON integrations.id = orders.integration_id
      WHERE orders.id = order_items.order_id
        AND integrations.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABELA: payments
-- Transações financeiras associadas aos pedidos
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id            UUID          NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  order_id                  UUID          REFERENCES orders(id) ON DELETE SET NULL,
  external_transaction_id   TEXT          NOT NULL,
  amount                    NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency                  TEXT          NOT NULL DEFAULT 'BRL',
  payment_method            TEXT          NOT NULL DEFAULT '',
  marketplace_fee           NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount                NUMERIC(14,2) NOT NULL DEFAULT 0,
  status                    TEXT          NOT NULL,
  transaction_date          TIMESTAMPTZ   NOT NULL,
  description               TEXT          NOT NULL DEFAULT '',
  synced_at                 TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (integration_id, external_transaction_id)
);

CREATE INDEX IF NOT EXISTS payments_integration_id_idx ON payments (integration_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments (order_id);
CREATE INDEX IF NOT EXISTS payments_transaction_date_idx ON payments (transaction_date DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: usuário lê via integração" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = payments.integration_id
        AND integrations.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABELA: fees
-- Taxas e comissões cobradas pelos marketplaces
-- ============================================================
CREATE TABLE IF NOT EXISTS fees (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id   UUID          NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  order_id         UUID          REFERENCES orders(id) ON DELETE SET NULL,
  external_fee_id  TEXT          NOT NULL,
  fee_type         TEXT          NOT NULL,
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency         TEXT          NOT NULL DEFAULT 'BRL',
  description      TEXT          NOT NULL DEFAULT '',
  fee_date         TIMESTAMPTZ   NOT NULL,
  synced_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (integration_id, external_fee_id)
);

CREATE INDEX IF NOT EXISTS fees_integration_id_idx ON fees (integration_id);
CREATE INDEX IF NOT EXISTS fees_order_id_idx ON fees (order_id);

ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fees: usuário lê via integração" ON fees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = fees.integration_id
        AND integrations.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABELA: payouts
-- Repasses / saques dos marketplaces para a conta bancária
-- ============================================================
CREATE TABLE IF NOT EXISTS payouts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id      UUID          NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  external_payout_id  TEXT          NOT NULL,
  amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency            TEXT          NOT NULL DEFAULT 'BRL',
  status              TEXT          NOT NULL,
  bank_account        TEXT          NOT NULL DEFAULT '',
  scheduled_at        TIMESTAMPTZ   NOT NULL,
  completed_at        TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (integration_id, external_payout_id)
);

CREATE TRIGGER payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS payouts_integration_id_idx ON payouts (integration_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts (status);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payouts: usuário lê via integração" ON payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM integrations
      WHERE integrations.id = payouts.integration_id
        AND integrations.user_id = auth.uid()
    )
  );
