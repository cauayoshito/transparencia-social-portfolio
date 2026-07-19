-- Metas: meio de verificação (spec: Meta / descrição / indicador / meio de verificação)
alter table public.project_goals
  add column if not exists verification text;
comment on column public.project_goals.verification is 'Meio de verificação da meta (spec dos formulários por tipo).';

-- Orçamento: detalhes específicos por bloco (spec Recursos Públicos)
-- RH: formação, função, horas de dedicação, vínculo PF/PJ (qtd=meses, unitário=valor mensal)
-- Materiais: justificativa
alter table public.project_budget_items
  add column if not exists details jsonb;
comment on column public.project_budget_items.details is 'Detalhes por bloco: rh_formacao, rh_funcao, rh_horas, rh_vinculo, justificativa.';
