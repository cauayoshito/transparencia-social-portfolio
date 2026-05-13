-- ============================================================================
-- Migration: Tabelas financeiras do relatório (seções 12-14 do protótipo PHI)
--
-- O protótipo 4.1.pdf mostra 3 seções financeiras dentro do relatório:
--   12. Relatório financeiro (orçamento por tipo/item com colunas de valores)
--   13. Relatório de remanejamento (mudanças de destinação de verba)
--   14. Relação de recibos e notas fiscais (comprovantes vinculados a itens)
--
-- Além disso, há um resumo financeiro com:
--   Saldo Planejado, Saldo anterior, Repasse no período, Gasto real, Saldo em conta
-- ============================================================================

-- 1. Itens do orçamento financeiro do relatório (seção 12)
CREATE TABLE IF NOT EXISTS report_financial_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  -- Tipo de investimento (Comunicação, Materiais e Equipamentos, Recursos Humanos, etc.)
  investment_type   text NOT NULL,
  -- Descrição do item (Confecção de Camisas, Consultor, Educador Social 1, etc.)
  item_description  text NOT NULL,

  -- Colunas financeiras conforme protótipo PHI
  budget_planned    numeric(15,2) NOT NULL DEFAULT 0,    -- (1) Orçamento previsto
  total_spent       numeric(15,2) NOT NULL DEFAULT 0,    -- (2) Gasto total (todos períodos)
  total_reallocated numeric(15,2) NOT NULL DEFAULT 0,    -- (3) Remanejados Total
  previous_balance  numeric(15,2) NOT NULL DEFAULT 0,    -- (4) Saldo do relatório anterior
  period_expenses   numeric(15,2) NOT NULL DEFAULT 0,    -- (5) Total de gastos deste relatório
  period_realloc    numeric(15,2) NOT NULL DEFAULT 0,    -- (6) Remanejamentos deste relatório
  current_balance   numeric(15,2) NOT NULL DEFAULT 0,    -- Saldo Atual (calculado)

  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfi_report ON report_financial_items(report_id);

COMMENT ON TABLE report_financial_items IS 'Itens do relatório financeiro (seção 12 do PHI)';

-- 2. Resumo financeiro do relatório (totais)
CREATE TABLE IF NOT EXISTS report_financial_summary (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  planned_balance   numeric(15,2) DEFAULT 0,  -- Saldo Planejado
  previous_balance  numeric(15,2) DEFAULT 0,  -- Saldo anterior
  period_transfer   numeric(15,2) DEFAULT 0,  -- Repasse no período
  actual_expenses   numeric(15,2) DEFAULT 0,  -- Gasto real
  account_balance   numeric(15,2) DEFAULT 0,  -- Saldo em conta

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),

  UNIQUE(report_id)
);

COMMENT ON TABLE report_financial_summary IS 'Resumo financeiro do relatório (totais consolidados)';

-- 3. Remanejamentos (seção 13)
CREATE TABLE IF NOT EXISTS report_reallocations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  original_type     text NOT NULL,           -- Tipo Investimento original
  original_item     text NOT NULL,           -- Item original
  original_value    numeric(15,2) NOT NULL DEFAULT 0,  -- Vl Previsto

  new_type          text,                    -- Novo Tipo
  new_item          text,                    -- Novo Item
  reallocated_value numeric(15,2) NOT NULL DEFAULT 0,  -- Vl Remanejado

  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rr_report ON report_reallocations(report_id);

COMMENT ON TABLE report_reallocations IS 'Remanejamentos de verba (seção 13 do PHI)';

-- 4. Recibos e notas fiscais (seção 14)
CREATE TABLE IF NOT EXISTS report_receipts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id           uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  planning_item       text NOT NULL,           -- Item do Planejamento
  receipt_description text NOT NULL,           -- Item da Nota
  receipt_value       numeric(15,2) NOT NULL DEFAULT 0,  -- Valor
  receipt_number      text,                    -- Número da Nota
  receipt_date        date,                    -- Data
  is_reallocated      boolean DEFAULT false,   -- Item Remanejado (SIM/NÃO)

  -- Arquivo da nota fiscal (path no Storage)
  file_path           text,
  file_name           text,
  file_size           integer,
  mime_type           text,

  sort_order          integer DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rrec_report ON report_receipts(report_id);

COMMENT ON TABLE report_receipts IS 'Relação de recibos e notas fiscais (seção 14 do PHI)';

-- 5. Extratos bancários (seção 15)
CREATE TABLE IF NOT EXISTS report_bank_statements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  label       text NOT NULL,          -- Nome do extrato (Extrato 01, etc.)
  status      text DEFAULT 'ENVIADA', -- Status (ENVIADA, PENDENTE)
  file_path   text,
  file_name   text,
  file_size   integer,
  mime_type   text,

  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbs_report ON report_bank_statements(report_id);

COMMENT ON TABLE report_bank_statements IS 'Extratos bancários (seção 15 do PHI)';

-- 6. Enable RLS on all new tables
ALTER TABLE report_financial_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_financial_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_reallocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_bank_statements ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies - allow access if user can access the report's project
-- Using a simple approach: allow all for authenticated users, then enforce via application layer
-- (matching the existing pattern in the codebase)
CREATE POLICY "Authenticated users can manage report_financial_items"
  ON report_financial_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage report_financial_summary"
  ON report_financial_summary FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage report_reallocations"
  ON report_reallocations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage report_receipts"
  ON report_receipts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage report_bank_statements"
  ON report_bank_statements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
