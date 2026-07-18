-- Fase 2 (formulários por tipo): cronograma mês a mês, contrapartidas
-- pactuadas e avaliação de contrapartidas por relatório.

-- Cronograma de execução mês a mês do projeto (todos os tipos)
create table if not exists public.project_schedule_items (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  activity_month text,                -- "Janeiro".."Dezembro"
  activity_year  integer,
  activity       text not null,
  sort_order     integer default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_psi_project on public.project_schedule_items(project_id);
comment on table public.project_schedule_items is 'Cronograma de execução do projeto (mês/ano/atividade). A prestação de contas puxa estas linhas.';

-- Contrapartidas pactuadas (projetos INCENTIVADO)
create table if not exists public.project_counterparts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,           -- contrapartida
  description text,                    -- descrição da contrapartida
  sort_order  integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_pc_project on public.project_counterparts(project_id);
comment on table public.project_counterparts is 'Contrapartidas pactuadas do projeto incentivado.';

-- Avaliação das contrapartidas em cada relatório
create table if not exists public.report_counterpart_reviews (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references public.reports(id) on delete cascade,
  counterpart_id  uuid not null references public.project_counterparts(id) on delete cascade,
  execution       text,               -- Executado plenamente / parcialmente / Não executado
  comment         text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(report_id, counterpart_id)
);
create index if not exists idx_rcr_report on public.report_counterpart_reviews(report_id);
comment on table public.report_counterpart_reviews is 'Avaliação de contrapartidas por relatório de prestação de contas.';

-- RLS
alter table public.project_schedule_items enable row level security;
alter table public.project_counterparts enable row level security;
alter table public.report_counterpart_reviews enable row level security;

drop policy if exists "psi_all" on public.project_schedule_items;
create policy "psi_all" on public.project_schedule_items for all to authenticated
  using (public.phi_can_access_project(project_id))
  with check (public.phi_can_access_project(project_id));

drop policy if exists "pc_all" on public.project_counterparts;
create policy "pc_all" on public.project_counterparts for all to authenticated
  using (public.phi_can_access_project(project_id))
  with check (public.phi_can_access_project(project_id));

drop policy if exists "rcr_all" on public.report_counterpart_reviews;
create policy "rcr_all" on public.report_counterpart_reviews for all to authenticated
  using (public.user_has_report_access(report_id, auth.uid()))
  with check (public.user_has_report_access(report_id, auth.uid()));
