-- Remanejamento vinculado aos itens do orçamento (origem e destino),
-- para ajustar o disponível no relatório financeiro automaticamente.
alter table public.report_reallocations
  add column if not exists original_budget_item_id uuid
    references public.project_budget_items(id) on delete set null,
  add column if not exists new_budget_item_id uuid
    references public.project_budget_items(id) on delete set null;
