-- ============================================================================
-- Migration: Hardening — constraints, índices, RLS restritivo, cleanup
-- Resultado da auditoria de qualidade ETAPAS 1-5
-- ============================================================================

-- ============================================================================
-- FIX 1: Coluna duplicada de valor no projects
-- supabase.sql cria "value_total numeric", migration 0001 cria "total_value numeric(15,2)".
-- Unificamos em "total_value" (que tem precision correta) e removemos "value_total".
-- ============================================================================
DO $$
BEGIN
  -- Se value_total existe e total_value também, migrar dados e dropar a antiga
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'value_total'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'total_value'
  ) THEN
    -- Copiar dados de value_total para total_value onde total_value é NULL
    UPDATE projects SET total_value = value_total WHERE total_value IS NULL AND value_total IS NOT NULL;
    ALTER TABLE projects DROP COLUMN value_total;
  END IF;
END $$;

-- ============================================================================
-- FIX 2: CHECK constraints em colunas financeiras
-- Valores monetários e contadores não devem ser negativos
-- ============================================================================
ALTER TABLE projects
  ADD CONSTRAINT chk_projects_total_value_non_negative
    CHECK (total_value IS NULL OR total_value >= 0);

ALTER TABLE projects
  ADD CONSTRAINT chk_projects_people_served_non_negative
    CHECK (people_served IS NULL OR people_served >= 0);

-- start_date deve ser anterior ou igual a end_date
ALTER TABLE projects
  ADD CONSTRAINT chk_projects_dates_order
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);

-- state_uf deve ter exatamente 2 caracteres quando preenchido
ALTER TABLE projects
  ADD CONSTRAINT chk_projects_state_uf_length
    CHECK (state_uf IS NULL OR length(state_uf) = 2);

-- revision_count não-negativo
ALTER TABLE reports
  ADD CONSTRAINT chk_reports_revision_count_non_negative
    CHECK (revision_count IS NULL OR revision_count >= 0);

-- Financial items: valores não-negativos
ALTER TABLE report_financial_items
  ADD CONSTRAINT chk_rfi_budget_planned_non_negative CHECK (budget_planned >= 0),
  ADD CONSTRAINT chk_rfi_total_spent_non_negative CHECK (total_spent >= 0),
  ADD CONSTRAINT chk_rfi_period_expenses_non_negative CHECK (period_expenses >= 0);

-- Financial summary: valores não-negativos
ALTER TABLE report_financial_summary
  ADD CONSTRAINT chk_rfs_planned_balance_non_negative CHECK (planned_balance IS NULL OR planned_balance >= 0);

-- Receipts: valor não-negativo
ALTER TABLE report_receipts
  ADD CONSTRAINT chk_rr_receipt_value_non_negative CHECK (receipt_value >= 0);

-- Reallocations: valores não-negativos
ALTER TABLE report_reallocations
  ADD CONSTRAINT chk_rreal_original_value_non_negative CHECK (original_value >= 0),
  ADD CONSTRAINT chk_rreal_reallocated_value_non_negative CHECK (reallocated_value >= 0);

-- ============================================================================
-- FIX 3: Índices ausentes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_analyst_user_id ON projects(analyst_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);

-- ============================================================================
-- FIX 4: Coluna updated_at ausente em report_bank_statements
-- ============================================================================
ALTER TABLE report_bank_statements
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================================================
-- FIX 5: RLS restritivo nas tabelas financeiras
-- Substituir "USING(true) WITH CHECK(true)" por policies que verificam
-- se o usuário tem acesso ao projeto do relatório via project_memberships,
-- project_consultants, ou investor_memberships → organization_investor_links.
--
-- Abordagem: Criamos uma função auxiliar que verifica acesso e usamos nas policies.
-- ============================================================================

-- Função auxiliar: verifica se user tem acesso ao report via projeto
-- NOTA: As tabelas project_memberships, project_consultants, investor_memberships,
-- organization_investor_links existem no banco de produção (criadas fora das
-- migrations rastreadas). A função usa plpgsql com verificação de existência
-- das tabelas para não falhar em DBs sem elas.
CREATE OR REPLACE FUNCTION public.user_has_report_access(p_report_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
  v_org_id uuid;
  v_has_access boolean := false;
BEGIN
  -- Buscar projeto do relatório
  SELECT r.project_id, p.organization_id
  INTO v_project_id, v_org_id
  FROM reports r
  JOIN projects p ON p.id = r.project_id
  WHERE r.id = p_report_id;

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Path 1: project_memberships
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_memberships') THEN
    PERFORM 1 FROM project_memberships pm WHERE pm.project_id = v_project_id AND pm.user_id = p_user_id;
    IF FOUND THEN RETURN true; END IF;
  END IF;

  -- Path 2: project_consultants
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_consultants') THEN
    PERFORM 1 FROM project_consultants pc WHERE pc.project_id = v_project_id AND pc.consultant_user_id = p_user_id AND pc.active = true;
    IF FOUND THEN RETURN true; END IF;
  END IF;

  -- Path 3: investor via org link
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investor_memberships')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_investor_links')
  THEN
    PERFORM 1 FROM investor_memberships im
    JOIN organization_investor_links oil ON oil.investor_id = im.investor_id AND oil.status = 'ACTIVE'
    WHERE im.user_id = p_user_id AND oil.organization_id = v_org_id;
    IF FOUND THEN RETURN true; END IF;
  END IF;

  RETURN false;
END;
$$;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage report_financial_items" ON report_financial_items;
DROP POLICY IF EXISTS "Authenticated users can manage report_financial_summary" ON report_financial_summary;
DROP POLICY IF EXISTS "Authenticated users can manage report_reallocations" ON report_reallocations;
DROP POLICY IF EXISTS "Authenticated users can manage report_receipts" ON report_receipts;
DROP POLICY IF EXISTS "Authenticated users can manage report_bank_statements" ON report_bank_statements;

-- New restrictive policies: SELECT
CREATE POLICY "rfi_select" ON report_financial_items FOR SELECT TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rfi_insert" ON report_financial_items FOR INSERT TO authenticated
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rfi_update" ON report_financial_items FOR UPDATE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()))
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rfi_delete" ON report_financial_items FOR DELETE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

-- report_financial_summary
CREATE POLICY "rfs_select" ON report_financial_summary FOR SELECT TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rfs_insert" ON report_financial_summary FOR INSERT TO authenticated
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rfs_update" ON report_financial_summary FOR UPDATE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()))
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rfs_delete" ON report_financial_summary FOR DELETE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

-- report_reallocations
CREATE POLICY "rreal_select" ON report_reallocations FOR SELECT TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rreal_insert" ON report_reallocations FOR INSERT TO authenticated
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rreal_update" ON report_reallocations FOR UPDATE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()))
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rreal_delete" ON report_reallocations FOR DELETE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

-- report_receipts
CREATE POLICY "rrec_select" ON report_receipts FOR SELECT TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rrec_insert" ON report_receipts FOR INSERT TO authenticated
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rrec_update" ON report_receipts FOR UPDATE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()))
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rrec_delete" ON report_receipts FOR DELETE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

-- report_bank_statements
CREATE POLICY "rbs_select" ON report_bank_statements FOR SELECT TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rbs_insert" ON report_bank_statements FOR INSERT TO authenticated
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rbs_update" ON report_bank_statements FOR UPDATE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()))
  WITH CHECK (public.user_has_report_access(report_id, auth.uid()));

CREATE POLICY "rbs_delete" ON report_bank_statements FOR DELETE TO authenticated
  USING (public.user_has_report_access(report_id, auth.uid()));

-- ============================================================================
-- FIX 6: Trigger para incrementar revision_count quando um review é criado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_revision_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE reports
  SET revision_count = COALESCE(revision_count, 0) + 1,
      updated_at = now()
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$;

-- Trigger só é criado se report_reviews existir (tabela criada fora das migrations rastreadas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'report_reviews') THEN
    DROP TRIGGER IF EXISTS trg_increment_revision_count ON report_reviews;
    CREATE TRIGGER trg_increment_revision_count
      AFTER INSERT ON report_reviews
      FOR EACH ROW
      EXECUTE FUNCTION public.increment_revision_count();
  END IF;
END $$;

-- ============================================================================
-- FIX 7: Trigger para atualizar sent_to_investor_at quando status muda para SUBMITTED
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_report_submission_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'SUBMITTED' AND (OLD.status IS DISTINCT FROM 'SUBMITTED') THEN
    NEW.sent_to_investor_at = COALESCE(NEW.sent_to_investor_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_submission_timestamps ON reports;
CREATE TRIGGER trg_report_submission_timestamps
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_report_submission_timestamps();
