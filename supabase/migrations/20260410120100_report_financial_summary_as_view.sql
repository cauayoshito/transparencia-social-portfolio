-- ============================================================================
-- Resumo financeiro do relatório vira VIEW calculada (problema 3)
-- A tabela report_financial_summary estava VAZIA (0/12 relatórios) então
-- DROP é seguro. Mantemos o mesmo NOME para zero impacto no service.
--
-- Regras de cálculo:
--   planned_balance  = SUM(project_budget_items.planned_amount) do projeto
--   actual_expenses  = SUM(report_financial_items.period_expenses) do relatório
--   period_transfer  = SUM(project_planned_transfers.realized_amount)
--                      onde realized_at cai no period_start..period_end do relatório
--   account_balance  = soma cumulativa de (transfer - expenses) por projeto,
--                      ordenada por period_end (NULLS first) e created_at
--   previous_balance = mesma soma cumulativa, mas até o relatório ANTERIOR
-- ============================================================================

DROP TABLE IF EXISTS report_financial_summary CASCADE;

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
      SELECT SUM(period_expenses)
      FROM report_financial_items i
      WHERE i.report_id = r.id
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

COMMENT ON VIEW report_financial_summary IS
  'VIEW calculada. Substituiu a tabela homônima após problema 3. Não tentar INSERT/UPDATE.';
