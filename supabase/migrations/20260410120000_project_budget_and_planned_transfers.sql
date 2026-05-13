-- ============================================================================
-- Orçamento e repasses no nível do PROJETO (antes de qualquer relatório)
-- Resolve o problema 1: cliente precisa cadastrar previsto no cadastro
-- do projeto, não dentro de relatório.
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_budget_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  investment_type   text NOT NULL,
  item_description  text NOT NULL,
  planned_amount    numeric(15,2) NOT NULL DEFAULT 0,
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pbi_project ON project_budget_items(project_id);

COMMENT ON TABLE project_budget_items IS
  'Linhas de orçamento previsto do projeto. Origem do "Saldo Planejado" do resumo do relatório.';

CREATE TABLE IF NOT EXISTS project_planned_transfers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reference_date    date NOT NULL,
  planned_amount    numeric(15,2) NOT NULL DEFAULT 0,
  realized_amount   numeric(15,2),
  realized_at       date,
  description       text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppt_project ON project_planned_transfers(project_id);
CREATE INDEX IF NOT EXISTS idx_ppt_realized_at ON project_planned_transfers(project_id, realized_at);

COMMENT ON TABLE project_planned_transfers IS
  'Cronograma de repasses do projeto (previsto + realizado). O resumo do relatório usa realized_amount filtrado pelo período.';

ALTER TABLE project_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_planned_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage project_budget_items"
  ON project_budget_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage project_planned_transfers"
  ON project_planned_transfers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
