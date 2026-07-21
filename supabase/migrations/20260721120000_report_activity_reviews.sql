-- Avaliação de cada marco do cronograma do projeto, por relatório.
-- O relatório PUXA os marcos (project_milestones) e a organização preenche
-- somente a avaliação: execução + comentário.
create table if not exists public.report_activity_reviews (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.reports(id) on delete cascade,
  milestone_id uuid not null references public.project_milestones(id) on delete cascade,
  execution    text,
  evaluation   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(report_id, milestone_id)
);
create index if not exists idx_rar_report on public.report_activity_reviews(report_id);
comment on table public.report_activity_reviews is 'Avaliação de marcos do cronograma por relatório (execução + comentário).';

alter table public.report_activity_reviews enable row level security;
drop policy if exists "rar_all" on public.report_activity_reviews;
create policy "rar_all" on public.report_activity_reviews for all to authenticated
  using (public.user_has_report_access(report_id, auth.uid()))
  with check (public.user_has_report_access(report_id, auth.uid()));
