-- Repasse do recurso lançado no próprio relatório (valor, data, tipo).
create table if not exists public.report_transfers (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.reports(id) on delete cascade,
  amount        numeric(15,2) not null default 0,
  transfer_date date,
  transfer_type text,                 -- 'Repasse único' | 'Parcela'
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_rt_report on public.report_transfers(report_id);
comment on table public.report_transfers is 'Repasses do recurso lançados no relatório (valor/data/tipo). Alimentam Repasse no período.';

alter table public.report_transfers enable row level security;
drop policy if exists "rt_all" on public.report_transfers;
create policy "rt_all" on public.report_transfers for all to authenticated
  using (public.user_has_report_access(report_id, auth.uid()))
  with check (public.user_has_report_access(report_id, auth.uid()));

-- Repasse no período passa a somar os repasses lançados no relatório.
CREATE OR REPLACE VIEW report_financial_summary AS
WITH planned AS (
  SELECT project_id,
         COALESCE(SUM(planned_amount), 0)::numeric(15,2) AS planned_balance
  FROM project_budget_items GROUP BY project_id
),
per_report AS (
  SELECT
    r.id AS report_id, r.project_id, r.period_start, r.period_end, r.created_at,
    COALESCE((SELECT SUM(rc.receipt_value) FROM report_receipts rc WHERE rc.report_id = r.id),0)::numeric(15,2) AS actual_expenses,
    COALESCE((SELECT SUM(tr.amount) FROM report_transfers tr WHERE tr.report_id = r.id),0)::numeric(15,2) AS period_transfer
  FROM reports r
),
cumulative AS (
  SELECT pr.report_id, pr.project_id, pr.actual_expenses, pr.period_transfer,
    COALESCE(SUM(pr.period_transfer - pr.actual_expenses) OVER (
      PARTITION BY pr.project_id ORDER BY pr.period_end NULLS FIRST, pr.created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0)::numeric(15,2) AS previous_balance,
    SUM(pr.period_transfer - pr.actual_expenses) OVER (
      PARTITION BY pr.project_id ORDER BY pr.period_end NULLS FIRST, pr.created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)::numeric(15,2) AS account_balance
  FROM per_report pr
)
SELECT c.report_id AS id, c.report_id,
  COALESCE(p.planned_balance,0)::numeric(15,2) AS planned_balance,
  c.previous_balance, c.period_transfer, c.actual_expenses, c.account_balance,
  now() AS created_at, now() AS updated_at
FROM cumulative c
LEFT JOIN reports r ON r.id = c.report_id
LEFT JOIN planned p ON p.project_id = r.project_id;
