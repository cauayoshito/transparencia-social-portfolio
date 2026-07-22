-- Progresso das metas do projeto por relatório: o realizado no período é
-- lançado manualmente; acumulado e % são calculados. Avaliação por meta.
create table if not exists public.report_goal_progress (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references public.reports(id) on delete cascade,
  goal_id         uuid not null references public.project_goals(id) on delete cascade,
  realized_period numeric(15,2) not null default 0,
  evaluation      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(report_id, goal_id)
);
create index if not exists idx_rgp_report on public.report_goal_progress(report_id);
create index if not exists idx_rgp_goal on public.report_goal_progress(goal_id);
comment on table public.report_goal_progress is 'Realizado no período + avaliação de cada meta do projeto, por relatório.';

alter table public.report_goal_progress enable row level security;
drop policy if exists "rgp_all" on public.report_goal_progress;
create policy "rgp_all" on public.report_goal_progress for all to authenticated
  using (public.user_has_report_access(report_id, auth.uid()))
  with check (public.user_has_report_access(report_id, auth.uid()));
