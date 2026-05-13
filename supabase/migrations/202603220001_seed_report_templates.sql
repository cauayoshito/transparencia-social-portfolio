-- ============================================================
-- SEED: Report templates base para MVP
-- Cria 1 template por tipo de projeto com seções e campos mínimos
-- para que o fluxo de relatório funcione de ponta a ponta.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Helper: só insere se não existe template ativo para o tipo
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_template_id uuid;
  v_section_id  uuid;
BEGIN

  -- =========================================================
  -- TEMPLATE: INCENTIVADO (Incentivos Fiscais)
  -- =========================================================
  IF NOT EXISTS (
    SELECT 1 FROM report_templates
    WHERE project_type = 'INCENTIVADO' AND is_active = true
  ) THEN
    v_template_id := gen_random_uuid();

    INSERT INTO report_templates (id, name, project_type, is_active, version, meta, created_by)
    VALUES (
      v_template_id,
      'Relatório Mensal — Incentivos Fiscais',
      'INCENTIVADO',
      true,
      1,
      '{}',
      null
    );

    -- Seção 1: Identificação
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Identificação do Projeto', 0);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'nome_projeto', 'Nome do Projeto', 'TEXT', true, 0, '', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'periodo_referencia', 'Período de Referência', 'TEXT', true, 1, 'Ex: Março/2026', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'responsavel', 'Responsável pelo Preenchimento', 'TEXT', true, 2, '', '{}', '{}');

    -- Seção 2: Atividades Realizadas
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Atividades Realizadas no Período', 1);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'atividades_descricao', 'Descrição das Atividades', 'TEXTAREA', true, 0, 'Descreva as principais atividades realizadas no período.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'publico_atendido', 'Público Atendido', 'TEXT', false, 1, 'Quantidade e perfil do público atendido no período.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'local_execucao', 'Local de Execução', 'TEXT', false, 2, '', '{}', '{}');

    -- Seção 3: Resultados e Indicadores
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Resultados e Indicadores', 2);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'metas_alcancadas', 'Metas Alcançadas', 'TEXTAREA', true, 0, 'Relate o progresso em relação às metas previstas.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'indicadores_quantitativos', 'Indicadores Quantitativos', 'TEXTAREA', false, 1, 'Números, percentuais e dados mensuráveis.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'dificuldades', 'Dificuldades Encontradas', 'TEXTAREA', false, 2, 'Descreva obstáculos e como foram tratados.', '{}', '{}');

    -- Seção 4: Observações
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Observações Gerais', 3);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'observacoes', 'Observações', 'TEXTAREA', false, 0, 'Informações adicionais relevantes para o período.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'proximos_passos', 'Próximos Passos', 'TEXTAREA', false, 1, 'Ações previstas para o próximo período.', '{}', '{}');

    RAISE NOTICE 'Template INCENTIVADO criado: %', v_template_id;
  END IF;

  -- =========================================================
  -- TEMPLATE: RECURSOS_PUBLICOS
  -- =========================================================
  IF NOT EXISTS (
    SELECT 1 FROM report_templates
    WHERE project_type = 'RECURSOS_PUBLICOS' AND is_active = true
  ) THEN
    v_template_id := gen_random_uuid();

    INSERT INTO report_templates (id, name, project_type, is_active, version, meta, created_by)
    VALUES (
      v_template_id,
      'Relatório Mensal — Recursos Públicos',
      'RECURSOS_PUBLICOS',
      true,
      1,
      '{}',
      null
    );

    -- Seção 1: Identificação
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Identificação do Projeto', 0);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'nome_projeto', 'Nome do Projeto', 'TEXT', true, 0, '', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'periodo_referencia', 'Período de Referência', 'TEXT', true, 1, 'Ex: Março/2026', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'responsavel', 'Responsável pelo Preenchimento', 'TEXT', true, 2, '', '{}', '{}');

    -- Seção 2: Atividades
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Atividades Realizadas no Período', 1);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'atividades_descricao', 'Descrição das Atividades', 'TEXTAREA', true, 0, 'Descreva as principais atividades realizadas no período.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'publico_atendido', 'Público Atendido', 'TEXT', false, 1, 'Quantidade e perfil do público atendido.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'local_execucao', 'Local de Execução', 'TEXT', false, 2, '', '{}', '{}');

    -- Seção 3: Resultados
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Resultados e Indicadores', 2);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'metas_alcancadas', 'Metas Alcançadas', 'TEXTAREA', true, 0, 'Relate o progresso em relação às metas previstas.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'indicadores_quantitativos', 'Indicadores Quantitativos', 'TEXTAREA', false, 1, 'Números, percentuais e dados mensuráveis.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'dificuldades', 'Dificuldades Encontradas', 'TEXTAREA', false, 2, 'Descreva obstáculos e como foram tratados.', '{}', '{}');

    -- Seção 4: Observações
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Observações Gerais', 3);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'observacoes', 'Observações', 'TEXTAREA', false, 0, 'Informações adicionais relevantes.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'proximos_passos', 'Próximos Passos', 'TEXTAREA', false, 1, 'Ações previstas para o próximo período.', '{}', '{}');

    RAISE NOTICE 'Template RECURSOS_PUBLICOS criado: %', v_template_id;
  END IF;

  -- =========================================================
  -- TEMPLATE: RECURSOS_PROPRIOS
  -- =========================================================
  IF NOT EXISTS (
    SELECT 1 FROM report_templates
    WHERE project_type = 'RECURSOS_PROPRIOS' AND is_active = true
  ) THEN
    v_template_id := gen_random_uuid();

    INSERT INTO report_templates (id, name, project_type, is_active, version, meta, created_by)
    VALUES (
      v_template_id,
      'Relatório Mensal — Recursos Próprios',
      'RECURSOS_PROPRIOS',
      true,
      1,
      '{}',
      null
    );

    -- Seção 1: Identificação
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Identificação do Projeto', 0);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'nome_projeto', 'Nome do Projeto', 'TEXT', true, 0, '', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'periodo_referencia', 'Período de Referência', 'TEXT', true, 1, 'Ex: Março/2026', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'responsavel', 'Responsável pelo Preenchimento', 'TEXT', true, 2, '', '{}', '{}');

    -- Seção 2: Atividades
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Atividades Realizadas no Período', 1);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'atividades_descricao', 'Descrição das Atividades', 'TEXTAREA', true, 0, 'Descreva as principais atividades realizadas no período.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'publico_atendido', 'Público Atendido', 'TEXT', false, 1, 'Quantidade e perfil do público atendido.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'local_execucao', 'Local de Execução', 'TEXT', false, 2, '', '{}', '{}');

    -- Seção 3: Resultados
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Resultados e Indicadores', 2);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'metas_alcancadas', 'Metas Alcançadas', 'TEXTAREA', true, 0, 'Relate o progresso em relação às metas previstas.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'indicadores_quantitativos', 'Indicadores Quantitativos', 'TEXTAREA', false, 1, 'Números, percentuais e dados mensuráveis.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'dificuldades', 'Dificuldades Encontradas', 'TEXTAREA', false, 2, '', '{}', '{}');

    -- Seção 4: Observações
    v_section_id := gen_random_uuid();
    INSERT INTO template_sections (id, template_id, title, sort_order)
    VALUES (v_section_id, v_template_id, 'Observações Gerais', 3);

    INSERT INTO template_fields (id, template_id, section_id, key, label, field_type, required, sort_order, help_text, options, validation)
    VALUES
      (gen_random_uuid(), v_template_id, v_section_id, 'observacoes', 'Observações', 'TEXTAREA', false, 0, 'Informações adicionais relevantes.', '{}', '{}'),
      (gen_random_uuid(), v_template_id, v_section_id, 'proximos_passos', 'Próximos Passos', 'TEXTAREA', false, 1, 'Ações previstas para o próximo período.', '{}', '{}');

    RAISE NOTICE 'Template RECURSOS_PROPRIOS criado: %', v_template_id;
  END IF;

END $$;
