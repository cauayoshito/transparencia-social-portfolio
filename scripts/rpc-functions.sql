-- ============================================================
-- TRANSPARÊNCIA SOCIAL: RPC FUNCTIONS (SECURITY DEFINER)
-- ============================================================
--
-- Funções para executar o fluxo de relatórios sem bypass de triggers/RLS.
-- Cada função seta o contexto auth via set_config antes das operações.
--
-- FUNÇÕES:
--   phi_set_auth_context(uuid)        — Seta auth.uid() para o usuário
--   phi_create_project(...)           — Cria projeto
--   phi_create_report(...)            — Cria relatório + versão v1
--   phi_add_financial_data(...)       — Adiciona itens financeiros, comprovantes, extratos
--   phi_submit_report(uuid, uuid)     — Envia relatório (DRAFT/RETURNED → SUBMITTED)
--   phi_review_report(...)            — Consultor/Investidor aprova ou devolve
--   phi_reopen_to_draft(...)          — Reabre relatório devolvido (RETURNED → DRAFT)
--
-- DEPENDÊNCIA:
--   increment_revision_count() — Trigger modificado para respeitar flag phi.skip_revision_increment
--
-- COMO INSTALAR:
--   Via Supabase Dashboard → SQL Editor → Cole e execute
--   Ou via MCP: execute_sql com project_id = 'nbgbqguiijgylbjhzafs'
--
-- ============================================================

-- ============================================================
-- 0. TRIGGER: increment_revision_count (MODIFIED)
-- ============================================================
-- Adicionada verificação de flag para evitar conflito de cascade
-- quando phi_review_report já incrementou revision_count.

CREATE OR REPLACE FUNCTION increment_revision_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If an RPC is already managing revision_count, skip the cascade
  IF current_setting('phi.skip_revision_increment', true) = 'true' THEN
    RETURN NEW;
  END IF;

  UPDATE reports
  SET revision_count = COALESCE(revision_count, 0) + 1,
      updated_at = now()
  WHERE id = NEW.report_id;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. phi_set_auth_context
-- ============================================================
-- Seta request.jwt.claim.sub para que auth.uid() retorne o user correto.
-- NÃO seta 'role' pois Supabase bloqueia dentro de SECURITY DEFINER.

CREATE OR REPLACE FUNCTION phi_set_auth_context(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_user_id::text,
    'role', 'authenticated'
  )::text, true);
END;
$$;

-- ============================================================
-- 2. phi_create_project
-- ============================================================

CREATE OR REPLACE FUNCTION phi_create_project(
  p_user_id       uuid,
  p_org_id        uuid,
  p_investor_id   uuid,
  p_title         text,
  p_description   text DEFAULT NULL,
  p_project_type  project_type DEFAULT 'INCENTIVADO',
  p_total_value   numeric DEFAULT 0,
  p_people_served integer DEFAULT 0,
  p_start_date    date DEFAULT CURRENT_DATE,
  p_end_date      date DEFAULT (CURRENT_DATE + interval '1 year')::date,
  p_state_uf      text DEFAULT NULL,
  p_area_of_action text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  PERFORM phi_set_auth_context(p_user_id);

  INSERT INTO projects (
    organization_id, project_type, title, description, status,
    created_by, investor_id, total_value, people_served,
    start_date, end_date, state_uf, area_of_action
  ) VALUES (
    p_org_id, p_project_type, p_title, p_description,
    'DRAFT', p_user_id, p_investor_id,
    p_total_value, p_people_served,
    p_start_date, p_end_date, p_state_uf, p_area_of_action
  )
  RETURNING id INTO v_project_id;

  RETURN v_project_id;
END;
$$;

-- ============================================================
-- 3. phi_create_report
-- ============================================================

CREATE OR REPLACE FUNCTION phi_create_report(
  p_user_id      uuid,
  p_project_id   uuid,
  p_title        text,
  p_period_start date DEFAULT CURRENT_DATE,
  p_period_end   date DEFAULT (CURRENT_DATE + interval '1 month' - interval '1 day')::date,
  p_period_type  report_period_type DEFAULT 'MONTHLY',
  p_data         jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id  uuid;
  v_version_id uuid;
BEGIN
  PERFORM phi_set_auth_context(p_user_id);

  INSERT INTO reports (
    project_id, period_type, period_start, period_end,
    status, current_version, created_by, title
  ) VALUES (
    p_project_id, p_period_type, p_period_start, p_period_end,
    'DRAFT', 1, p_user_id, p_title
  )
  RETURNING id INTO v_report_id;

  INSERT INTO report_versions (
    report_id, version_number, status, data, created_by
  ) VALUES (
    v_report_id, 1, 'DRAFT', p_data, p_user_id
  )
  RETURNING id INTO v_version_id;

  RETURN jsonb_build_object(
    'report_id', v_report_id,
    'version_id', v_version_id,
    'status', 'DRAFT',
    'version_number', 1
  );
END;
$$;

-- ============================================================
-- 4. phi_add_financial_data
-- ============================================================

CREATE OR REPLACE FUNCTION phi_add_financial_data(
  p_user_id    uuid,
  p_report_id  uuid,
  p_items      jsonb DEFAULT '[]'::jsonb,
  p_receipts   jsonb DEFAULT '[]'::jsonb,
  p_statements jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item   jsonb;
  v_count_items    integer := 0;
  v_count_receipts integer := 0;
  v_count_stmts    integer := 0;
BEGIN
  PERFORM phi_set_auth_context(p_user_id);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO report_financial_items (
      report_id, investment_type, item_description,
      budget_planned, total_spent, period_expenses, current_balance, sort_order
    ) VALUES (
      p_report_id,
      v_item->>'investment_type',
      v_item->>'item_description',
      COALESCE((v_item->>'budget_planned')::numeric, 0),
      COALESCE((v_item->>'total_spent')::numeric, 0),
      COALESCE((v_item->>'period_expenses')::numeric, 0),
      COALESCE((v_item->>'current_balance')::numeric, 0),
      COALESCE((v_item->>'sort_order')::integer, v_count_items + 1)
    );
    v_count_items := v_count_items + 1;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    INSERT INTO report_receipts (
      report_id, planning_item, receipt_description, receipt_value,
      receipt_number, receipt_date, file_path, file_name, sort_order
    ) VALUES (
      p_report_id,
      v_item->>'planning_item',
      v_item->>'receipt_description',
      COALESCE((v_item->>'receipt_value')::numeric, 0),
      v_item->>'receipt_number',
      (v_item->>'receipt_date')::date,
      v_item->>'file_path',
      v_item->>'file_name',
      COALESCE((v_item->>'sort_order')::integer, v_count_receipts + 1)
    );
    v_count_receipts := v_count_receipts + 1;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_statements)
  LOOP
    INSERT INTO report_bank_statements (
      report_id, label, status, file_path, file_name
    ) VALUES (
      p_report_id,
      v_item->>'label',
      COALESCE(v_item->>'status', 'ENVIADA'),
      v_item->>'file_path',
      v_item->>'file_name'
    );
    v_count_stmts := v_count_stmts + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'report_id', p_report_id,
    'financial_items_added', v_count_items,
    'receipts_added', v_count_receipts,
    'bank_statements_added', v_count_stmts
  );
END;
$$;

-- ============================================================
-- 5. phi_submit_report
-- ============================================================

CREATE OR REPLACE FUNCTION phi_submit_report(
  p_user_id   uuid,
  p_report_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report       reports%ROWTYPE;
  v_current      report_versions%ROWTYPE;
  v_next_version integer;
  v_version_id   uuid;
  v_has_receipts boolean;
BEGIN
  PERFORM phi_set_auth_context(p_user_id);

  SELECT * INTO v_report FROM reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report % not found', p_report_id;
  END IF;

  IF v_report.status NOT IN ('DRAFT', 'RETURNED') THEN
    RAISE EXCEPTION 'Cannot submit report in status %', v_report.status;
  END IF;

  -- Validate receipts exist (normalized table OR JSON legacy)
  SELECT EXISTS(
    SELECT 1 FROM report_receipts WHERE report_id = p_report_id
    UNION ALL
    SELECT 1 FROM report_versions rv
    WHERE rv.report_id = p_report_id
    AND (rv.data->'__assets'->'attachments'->'receipts') IS NOT NULL
    AND jsonb_array_length(rv.data->'__assets'->'attachments'->'receipts') > 0
    LIMIT 1
  ) INTO v_has_receipts;

  IF NOT v_has_receipts THEN
    RAISE EXCEPTION 'Anexe pelo menos um comprovante de despesa antes de enviar.';
  END IF;

  SELECT * INTO v_current FROM report_versions
  WHERE report_id = p_report_id
  ORDER BY version_number DESC LIMIT 1;

  v_next_version := COALESCE(v_current.version_number, 0) + 1;

  INSERT INTO report_versions (report_id, version_number, status, data, created_by)
  VALUES (p_report_id, v_next_version, 'SUBMITTED', COALESCE(v_current.data, '{}'::jsonb), p_user_id)
  RETURNING id INTO v_version_id;

  UPDATE reports SET
    status = 'SUBMITTED',
    current_version = v_next_version,
    updated_at = now()
  WHERE id = p_report_id;

  RETURN jsonb_build_object(
    'report_id', p_report_id,
    'version_id', v_version_id,
    'status', 'SUBMITTED',
    'version_number', v_next_version
  );
END;
$$;

-- ============================================================
-- 6. phi_review_report
-- ============================================================
-- Valida regra de negócio: consultor ativo OU investidor (se sem consultor).
-- Seta auth context como o AUTOR do relatório para satisfazer os triggers:
--   - SUBMITTED→APPROVED/RETURNED: trigger checa phi_is_project_org_admin()
--   - Cascade (increment_revision_count): trigger checa is_author
-- O revision_count é incrementado junto com o status UPDATE,
-- e a flag phi.skip_revision_increment evita double-increment no cascade.

CREATE OR REPLACE FUNCTION phi_review_report(
  p_reviewer_id uuid,
  p_report_id   uuid,
  p_decision    review_decision,
  p_comment     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current    record;
  v_project_id uuid;
  v_has_consultant boolean;
  v_new_status report_status;
BEGIN
  -- 1. Get current report state
  SELECT r.id, r.status, r.current_version, r.project_id, r.created_by
    INTO v_current
    FROM reports r
   WHERE r.id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report % not found', p_report_id;
  END IF;

  IF v_current.status <> 'SUBMITTED' THEN
    RAISE EXCEPTION 'Report must be SUBMITTED to review. Current: %', v_current.status;
  END IF;

  v_project_id := v_current.project_id;

  -- 2. Check if project has active consultant
  SELECT EXISTS(
    SELECT 1 FROM project_consultants
    WHERE project_id = v_project_id AND active = true
  ) INTO v_has_consultant;

  -- 3. Validate reviewer role (business rule)
  IF v_has_consultant THEN
    IF NOT EXISTS(
      SELECT 1 FROM project_consultants
      WHERE project_id = v_project_id AND consultant_user_id = p_reviewer_id AND active = true
    ) THEN
      RAISE EXCEPTION 'Reviewer must be the active consultant for this project';
    END IF;
  ELSE
    IF NOT EXISTS(
      SELECT 1 FROM project_memberships
      WHERE project_id = v_project_id AND user_id = p_reviewer_id AND role = 'INVESTOR'
    ) THEN
      RAISE EXCEPTION 'Reviewer must be the investor (no consultant on project)';
    END IF;
  END IF;

  -- 4. Map decision to status
  IF p_decision = 'APPROVED' THEN
    v_new_status := 'APPROVED';
  ELSIF p_decision = 'RETURNED' THEN
    v_new_status := 'RETURNED';
  ELSE
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  -- 5. Set auth context to report AUTHOR
  --    Satisfies trigger checks for both status transition and cascade
  PERFORM set_config('request.jwt.claim.sub', v_current.created_by::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_current.created_by::text,
    'role', 'authenticated'
  )::text, true);

  -- 6. Update status + revision_count in a single UPDATE
  UPDATE reports
     SET status = v_new_status,
         revision_count = COALESCE(revision_count, 0) + 1,
         updated_at = now()
   WHERE id = p_report_id;

  -- 7. Skip cascade increment (already done above)
  PERFORM set_config('phi.skip_revision_increment', 'true', true);

  -- 8. Insert review record
  INSERT INTO report_reviews (
    report_id, version_number, reviewer_user_id, decision, comment
  ) VALUES (
    p_report_id, v_current.current_version, p_reviewer_id, p_decision, p_comment
  );

  -- 9. Reset flag
  PERFORM set_config('phi.skip_revision_increment', 'false', true);

  RETURN jsonb_build_object(
    'report_id', p_report_id,
    'new_status', v_new_status,
    'decision', p_decision,
    'reviewer_id', p_reviewer_id,
    'version_reviewed', v_current.current_version
  );
END;
$$;

-- ============================================================
-- 7. phi_reopen_to_draft
-- ============================================================

CREATE OR REPLACE FUNCTION phi_reopen_to_draft(
  p_user_id   uuid,
  p_report_id uuid,
  p_new_data  jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report       reports%ROWTYPE;
  v_current      report_versions%ROWTYPE;
  v_next_version integer;
  v_version_id   uuid;
  v_data         jsonb;
BEGIN
  PERFORM phi_set_auth_context(p_user_id);

  SELECT * INTO v_report FROM reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report % not found', p_report_id;
  END IF;

  IF v_report.status <> 'RETURNED' THEN
    RAISE EXCEPTION 'Can only reopen RETURNED reports, current status: %', v_report.status;
  END IF;

  SELECT * INTO v_current FROM report_versions
  WHERE report_id = p_report_id
  ORDER BY version_number DESC LIMIT 1;

  v_next_version := COALESCE(v_current.version_number, 0) + 1;
  v_data := COALESCE(p_new_data, v_current.data);

  UPDATE reports SET
    status = 'DRAFT',
    current_version = v_next_version,
    updated_at = now()
  WHERE id = p_report_id;

  INSERT INTO report_versions (report_id, version_number, status, data, created_by)
  VALUES (p_report_id, v_next_version, 'DRAFT', v_data, p_user_id)
  RETURNING id INTO v_version_id;

  RETURN jsonb_build_object(
    'report_id', p_report_id,
    'version_id', v_version_id,
    'status', 'DRAFT',
    'version_number', v_next_version
  );
END;
$$;
