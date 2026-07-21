-- Vincula uma linha do relatório financeiro ao item de orçamento do projeto,
-- para o relatório PUXAR os itens do orçamento e a organização lançar apenas
-- o gasto no período de cada um.
alter table public.report_financial_items
  add column if not exists budget_item_id uuid
    references public.project_budget_items(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_rfi_report_budget'
  ) then
    alter table public.report_financial_items
      add constraint uq_rfi_report_budget unique (report_id, budget_item_id);
  end if;
end$$;
