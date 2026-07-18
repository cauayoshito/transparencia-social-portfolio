-- Seção de acompanhamento de atividades do relatório (modelo PHI: Mês, Ano,
-- Atividade, Execução, Avaliação). Aparece no início do relatório.
create table if not exists public.report_activities (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.reports(id) on delete cascade,
  activity_month text,                 -- Mês (ex: "Maio")
  activity_year  integer,              -- Ano
  activity       text not null,        -- Atividade
  execution      text,                 -- Execução (status)
  evaluation     text,                 -- Avaliação de processos, resultados parciais, comentários
  sort_order     integer default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_ract_report on public.report_activities(report_id);

comment on table public.report_activities is 'Acompanhamento de atividades do relatório (Mês/Ano/Atividade/Execução/Avaliação).';

alter table public.report_activities enable row level security;

create policy "ract_select" on public.report_activities for select to authenticated
  using (public.user_has_report_access(report_id, auth.uid()));
create policy "ract_insert" on public.report_activities for insert to authenticated
  with check (public.user_has_report_access(report_id, auth.uid()));
create policy "ract_update" on public.report_activities for update to authenticated
  using (public.user_has_report_access(report_id, auth.uid()))
  with check (public.user_has_report_access(report_id, auth.uid()));
create policy "ract_delete" on public.report_activities for delete to authenticated
  using (public.user_has_report_access(report_id, auth.uid()));
