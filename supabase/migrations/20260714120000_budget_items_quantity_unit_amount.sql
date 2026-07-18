-- Orçamento previsto: adiciona quantidade x valor unitário.
-- planned_amount passa a representar o TOTAL da linha (quantity * unit_amount),
-- calculado na aplicação ao salvar. Mantido como coluna comum para não quebrar
-- a view report_financial_summary que depende dele.

alter table public.project_budget_items
  add column if not exists quantity numeric not null default 1,
  add column if not exists unit_amount numeric not null default 0;

-- Backfill: linhas existentes viram quantidade 1 x valor unitário = planned_amount atual
update public.project_budget_items
  set unit_amount = planned_amount
  where unit_amount = 0 and planned_amount <> 0;

comment on column public.project_budget_items.quantity is 'Quantidade de itens. planned_amount = quantity * unit_amount.';
comment on column public.project_budget_items.unit_amount is 'Valor unitário (R$). planned_amount = quantity * unit_amount.';
