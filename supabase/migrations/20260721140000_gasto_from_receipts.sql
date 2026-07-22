-- Recibo/nota vinculado ao item do orçamento do projeto.
alter table public.report_receipts
  add column if not exists budget_item_id uuid
    references public.project_budget_items(id) on delete set null;

-- O gasto real do relatório passa a ser a SOMA dos recibos/notas fiscais,
-- em vez de report_financial_items.period_expenses.
CREATE OR REPLACE VIEW report_financial_summary AS
WITH planned AS (
  SELECT project_id,
         COALESCE(SUM(planned_amount), 0)::numeric(15,2) AS planned_balance
  FROM project_budget_items
  GROUP BY project_id
),
per_report AS (
  SELECT
    r.id            AS report_id,
    r.project_id,
    r.period_start,
    r.period_end,
    r.created_at,
    COALESCE((
      SELECT SUM(rc.receipt_value)
      FROM report_receipts rc
      WHERE rc.report_id = r.id
    ), 0)::numeric(15,2) AS actual_expenses,
    COALESCE((
      SELECT SUM(t.realized_amount)
      FROM project_planned_transfers t
      WHERE t.project_id = r.project_id
        AND t.realized_at IS NOT NULL
        AND (r.period_start IS NULL OR t.realized_at >= r.period_start)
        AND (r.period_end   IS NULL OR t.realized_at <= r.period_end)
    ), 0)::numeric(15,2) AS period_transfer
  FROM reports r
),
cumulative AS (
  SELECT
    pr.report_id,
    pr.project_id,
    pr.actual_expenses,
    pr.period_transfer,
    COALESCE(SUM(pr.period_transfer - pr.actual_expenses) OVER (
      PARTITION BY pr.project_id
      ORDER BY pr.period_end NULLS FIRST, pr.created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0)::numeric(15,2) AS previous_balance,
    SUM(pr.period_transfer - pr.actual_expenses) OVER (
      PARTITION BY pr.project_id
      ORDER BY pr.period_end NULLS FIRST, pr.created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )::numeric(15,2) AS account_balance
  FROM per_report pr
)
SELECT
  c.report_id                              AS id,
  c.report_id,
  COALESCE(p.planned_balance, 0)::numeric(15,2) AS planned_balance,
  c.previous_balance,
  c.period_transfer,
  c.actual_expenses,
  c.account_balance,
  now() AS created_at,
  now() AS updated_at
FROM cumulative c
LEFT JOIN reports r ON r.id = c.report_id
LEFT JOIN planned p ON p.project_id = r.project_id;
