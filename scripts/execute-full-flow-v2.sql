-- ============================================================
-- TRANSPARÊNCIA SOCIAL: FULL FLOW v2 — PRODUCTION-SAFE (via RPCs)
-- ============================================================
--
-- Executa o fluxo COMPLETO do sistema usando APENAS funções RPC.
-- NENHUM trigger é desabilitado. NENHUM bypass de RLS.
--
-- PRÉ-REQUISITOS:
--   1. RPCs instaladas (scripts/rpc-functions.sql)
--   2. Usuários de teste em auth.users + profiles
--   3. Organização e Investidor já existentes
--
-- CENÁRIO A: COM CONSULTOR
--   Org cria → preenche → envia → Consultor devolve → Org ajusta → reenvia → Consultor aprova
--
-- CENÁRIO B: SEM CONSULTOR
--   Org cria → preenche → envia → Investidor devolve → Org ajusta → reenvia → Investidor aprova
--
-- COMO RODAR:
--   Via Supabase Dashboard → SQL Editor → Cole e execute
--   Ou via MCP: execute_sql com project_id = 'nbgbqguiijgylbjhzafs'
--
-- ============================================================

DO $$
DECLARE
  -- ===== USERS (existing in auth.users) =====
  v_org_user_id        uuid := '2aa08a8a-edf6-49de-a57d-a5c3cf4d96fe';  -- org_admin@teste.com
  v_investor_user_id   uuid := '21c0c22b-e19e-485d-8390-3616288aae9d';  -- investor@teste.com
  v_consultant_user_id uuid := '11ff976c-81dc-4423-b98d-722d487370f3';  -- consultant

  -- ===== EXISTING ENTITIES =====
  v_org_id      uuid := '50dc2919-fd27-49a9-8bea-9bb326f538eb';  -- Organização Exemplo
  v_investor_id uuid := 'c75f147e-e779-45a2-981e-455fcfe2ca32';  -- Investidor Principal

  -- ===== GENERATED IDS =====
  v_project_a_id uuid;
  v_report_a     jsonb;
  v_report_a_id  uuid;

  v_project_b_id uuid;
  v_report_b     jsonb;
  v_report_b_id  uuid;

  v_result       jsonb;

BEGIN

  -- ===== ENSURE PROFILES (FK requirement) =====
  INSERT INTO profiles (id, full_name, email) VALUES
    (v_org_user_id, 'Admin Organização', 'org_admin@teste.com'),
    (v_investor_user_id, 'Investidor Principal', 'investor@teste.com'),
    (v_consultant_user_id, 'Consultor Teste', 'org_member@teste.com')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- ================================================================
  -- CENÁRIO A — COM CONSULTOR
  -- ================================================================

  -- A1: Create Project via RPC
  v_project_a_id := phi_create_project(
    v_org_user_id, v_org_id, v_investor_id,
    'Projeto Alpha v2 — Capacitação Jovens (COM Consultor, via RPC)',
    'Cenário A production-safe: consultor analisa e aprova. Zero bypass.',
    'INCENTIVADO'::project_type,
    150000.00, 200,
    '2026-04-01'::date, '2026-12-31'::date,
    'SP', 'Educação'
  );

  -- A2: Link consultant + memberships (using auth context)
  PERFORM phi_set_auth_context(v_org_user_id);

  INSERT INTO project_consultants (project_id, consultant_user_id, active)
  VALUES (v_project_a_id, v_consultant_user_id, true);

  INSERT INTO project_memberships (project_id, user_id, role) VALUES
    (v_project_a_id, v_org_user_id, 'OWNER'),
    (v_project_a_id, v_investor_user_id, 'INVESTOR'),
    (v_project_a_id, v_consultant_user_id, 'CONSULTANT')
  ON CONFLICT DO NOTHING;

  -- A3: Create Report + Version 1 via RPC
  v_report_a := phi_create_report(
    v_org_user_id, v_project_a_id,
    'Relatório Abril/2026 — Projeto Alpha v2',
    '2026-04-01'::date, '2026-04-30'::date,
    'MONTHLY'::report_period_type,
    jsonb_build_object(
      'objetivo_geral', 'Capacitar 200 jovens em habilidades técnicas para inserção no mercado.',
      'atividades_realizadas', '4 turmas de capacitação técnica. Parceria com 3 empresas para estágio.',
      'resultados_alcancados', '180 jovens matriculados. Frequência 92%.',
      'dificuldades', 'Atraso na entrega do material didático.',
      'proximos_passos', 'Módulo prático com empresas parceiras em maio.'
    )
  );
  v_report_a_id := (v_report_a->>'report_id')::uuid;

  -- A4: Add financial data via RPC
  v_result := phi_add_financial_data(
    v_org_user_id, v_report_a_id,
    '[
      {"investment_type":"CUSTEIO","item_description":"Material didático e apostilas","budget_planned":25000,"total_spent":18500,"period_expenses":18500,"current_balance":6500,"sort_order":1},
      {"investment_type":"CUSTEIO","item_description":"Alimentação e transporte dos jovens","budget_planned":15000,"total_spent":12300,"period_expenses":12300,"current_balance":2700,"sort_order":2}
    ]'::jsonb,
    '[{"planning_item":"Material didático","receipt_description":"NF 4521 - Editora Saber LTDA","receipt_value":18500,"receipt_number":"4521","receipt_date":"2026-04-15","file_path":"reports/receipts/nf-4521.pdf","file_name":"nf-4521.pdf","sort_order":1}]'::jsonb,
    '[{"label":"Extrato BB — Abril/2026","status":"ENVIADA","file_path":"reports/statements/bb-abr-2026.pdf","file_name":"bb-abr-2026.pdf"}]'::jsonb
  );

  -- A5: SUBMIT (DRAFT → SUBMITTED)
  v_result := phi_submit_report(v_org_user_id, v_report_a_id);
  RAISE NOTICE 'A5 SUBMIT: %', v_result;

  -- A6: CONSULTANT RETURNS (SUBMITTED → RETURNED)
  v_result := phi_review_report(
    v_consultant_user_id, v_report_a_id,
    'RETURNED'::review_decision,
    'Faltam comprovantes de transporte. Favor anexar recibos da empresa de ônibus.'
  );
  RAISE NOTICE 'A6 RETURN: %', v_result;

  -- A7: ORG REOPENS TO DRAFT + fixes
  v_result := phi_reopen_to_draft(
    v_org_user_id, v_report_a_id,
    jsonb_build_object(
      'objetivo_geral', 'Capacitar 200 jovens em habilidades técnicas para inserção no mercado.',
      'atividades_realizadas', '4 turmas de capacitação técnica. Parceria com 3 empresas para estágio.',
      'resultados_alcancados', '180 jovens matriculados. Frequência 92%.',
      'dificuldades', 'Atraso na entrega do material didático.',
      'proximos_passos', 'Módulo prático com empresas parceiras em maio.',
      'correcao', 'Comprovantes de transporte anexados conforme solicitado.'
    )
  );

  -- A8: Add missing receipt
  v_result := phi_add_financial_data(
    v_org_user_id, v_report_a_id,
    '[]'::jsonb,
    '[{"planning_item":"Transporte","receipt_description":"Recibo Transporte Escolar ABC","receipt_value":12300,"receipt_number":"REC-0089","receipt_date":"2026-04-20","file_path":"reports/receipts/rec-transporte.pdf","file_name":"rec-transporte.pdf","sort_order":2}]'::jsonb,
    '[]'::jsonb
  );

  -- A9: RESUBMIT (DRAFT → SUBMITTED)
  v_result := phi_submit_report(v_org_user_id, v_report_a_id);
  RAISE NOTICE 'A9 RESUBMIT: %', v_result;

  -- A10: CONSULTANT APPROVES (SUBMITTED → APPROVED)
  v_result := phi_review_report(
    v_consultant_user_id, v_report_a_id,
    'APPROVED'::review_decision,
    'Relatório completo. Comprovantes em ordem. Aprovado.'
  );
  RAISE NOTICE 'A10 APPROVED: %', v_result;

  RAISE NOTICE '✓ CENÁRIO A COMPLETO — projeto=% relatorio=%', v_project_a_id, v_report_a_id;

  -- ================================================================
  -- CENÁRIO B — SEM CONSULTOR (Investidor aprova direto)
  -- ================================================================

  -- B1: Create Project via RPC
  v_project_b_id := phi_create_project(
    v_org_user_id, v_org_id, v_investor_id,
    'Projeto Beta v2 — Horta Comunitária (SEM Consultor, via RPC)',
    'Cenário B production-safe: investidor aprova direto. Zero bypass.',
    'RECURSOS_PROPRIOS'::project_type,
    45000, 80,
    '2026-05-01'::date, '2026-11-30'::date,
    'MG', 'Segurança Alimentar'
  );

  -- B2: Memberships (NO consultant)
  PERFORM phi_set_auth_context(v_org_user_id);

  INSERT INTO project_memberships (project_id, user_id, role) VALUES
    (v_project_b_id, v_org_user_id, 'OWNER'),
    (v_project_b_id, v_investor_user_id, 'INVESTOR')
  ON CONFLICT DO NOTHING;

  -- B3: Create Report + Version 1
  v_report_b := phi_create_report(
    v_org_user_id, v_project_b_id,
    'Relatório Maio/2026 — Projeto Beta v2',
    '2026-05-01'::date, '2026-05-31'::date,
    'MONTHLY'::report_period_type,
    jsonb_build_object(
      'objetivo_geral', 'Implantar horta comunitária para 80 famílias.',
      'atividades_realizadas', 'Preparação terreno 2.000m², compra insumos, capacitação 40 voluntários.',
      'resultados_alcancados', '15 canteiros plantados. Primeira colheita prevista junho.',
      'proximos_passos', 'Ampliar para 30 canteiros. Iniciar distribuição semanal.'
    )
  );
  v_report_b_id := (v_report_b->>'report_id')::uuid;

  -- B4: Add financial data
  v_result := phi_add_financial_data(
    v_org_user_id, v_report_b_id,
    '[{"investment_type":"INVESTIMENTO","item_description":"Insumos agrícolas e ferramentas","budget_planned":20000,"total_spent":14800,"period_expenses":14800,"current_balance":5200,"sort_order":1}]'::jsonb,
    '[{"planning_item":"Insumos","receipt_description":"NF 7890 - Agro Insumos São José","receipt_value":14800,"receipt_number":"7890","receipt_date":"2026-05-10","file_path":"reports/receipts/nf-7890.pdf","file_name":"nf-7890.pdf","sort_order":1}]'::jsonb,
    '[]'::jsonb
  );

  -- B5: SUBMIT
  v_result := phi_submit_report(v_org_user_id, v_report_b_id);
  RAISE NOTICE 'B5 SUBMIT: %', v_result;

  -- B6: INVESTOR RETURNS
  v_result := phi_review_report(
    v_investor_user_id, v_report_b_id,
    'RETURNED'::review_decision,
    'Incluir comprovante de preparação do terreno e detalhar custos de mão de obra.'
  );
  RAISE NOTICE 'B6 RETURN: %', v_result;

  -- B7: ORG FIXES
  v_result := phi_reopen_to_draft(
    v_org_user_id, v_report_b_id,
    jsonb_build_object(
      'objetivo_geral', 'Implantar horta comunitária para 80 famílias.',
      'atividades_realizadas', 'Preparação terreno 2.000m², compra insumos, capacitação 40 voluntários.',
      'resultados_alcancados', '15 canteiros plantados. Primeira colheita prevista junho.',
      'proximos_passos', 'Ampliar para 30 canteiros. Iniciar distribuição semanal.',
      'detalhe_mao_obra', 'R$ 8.000 preparação + R$ 3.200 plantio.'
    )
  );

  -- B8: Add missing receipt
  v_result := phi_add_financial_data(
    v_org_user_id, v_report_b_id,
    '[]'::jsonb,
    '[{"planning_item":"Mão de obra","receipt_description":"Recibo Mão de Obra Terreno","receipt_value":8000,"receipt_number":"REC-MO-001","receipt_date":"2026-05-05","file_path":"reports/receipts/rec-mo-001.pdf","file_name":"rec-mo-001.pdf","sort_order":2}]'::jsonb,
    '[]'::jsonb
  );

  -- B9: RESUBMIT
  v_result := phi_submit_report(v_org_user_id, v_report_b_id);
  RAISE NOTICE 'B9 RESUBMIT: %', v_result;

  -- B10: INVESTOR APPROVES
  v_result := phi_review_report(
    v_investor_user_id, v_report_b_id,
    'APPROVED'::review_decision,
    'Documentação completa. Projeto com bom andamento. Aprovado.'
  );
  RAISE NOTICE 'B10 APPROVED: %', v_result;

  RAISE NOTICE '✓ CENÁRIO B COMPLETO — projeto=% relatorio=%', v_project_b_id, v_report_b_id;
  RAISE NOTICE '✓ FLUXO COMPLETO EXECUTADO — ZERO TRIGGERS DESABILITADOS';

END $$;
