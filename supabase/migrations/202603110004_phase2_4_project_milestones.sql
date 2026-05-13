create extension if not exists pgcrypto;

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  goal_id uuid null references public.project_goals(id) on delete set null,
  title text not null,
  description text null,
  starts_at date null,
  ends_at date null,
  status text not null default 'PLANNED' check (status in ('PLANNED', 'IN_PROGRESS', 'DONE', 'DELAYED')),
  sort_order integer not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_milestones_date_range_check
    check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create index if not exists project_milestones_project_idx
  on public.project_milestones (project_id, sort_order, created_at);

create index if not exists project_milestones_org_idx
  on public.project_milestones (organization_id);

create index if not exists project_milestones_goal_idx
  on public.project_milestones (goal_id);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'phi_set_updated_at'
      and pg_function_is_visible(oid)
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_project_milestones_set_updated_at'
  ) then
    create trigger trg_project_milestones_set_updated_at
      before update on public.project_milestones
      for each row
      execute function public.phi_set_updated_at();
  end if;
end;
$$;

alter table public.project_milestones enable row level security;

drop policy if exists "project_milestones_select" on public.project_milestones;
create policy "project_milestones_select"
on public.project_milestones
for select
using (
  exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = project_milestones.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.projects p
    join public.organization_memberships om
      on om.organization_id = p.organization_id
    where p.id = project_milestones.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "project_milestones_insert" on public.project_milestones;
create policy "project_milestones_insert"
on public.project_milestones
for insert
with check (
  organization_id = (
    select p.organization_id
    from public.projects p
    where p.id = project_milestones.project_id
  )
  and (
    exists (
      select 1
      from public.project_memberships pm
      where pm.project_id = project_milestones.project_id
        and pm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.projects p
      join public.organization_memberships om
        on om.organization_id = p.organization_id
      where p.id = project_milestones.project_id
        and om.user_id = auth.uid()
    )
  )
);

drop policy if exists "project_milestones_update" on public.project_milestones;
create policy "project_milestones_update"
on public.project_milestones
for update
using (
  exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = project_milestones.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.projects p
    join public.organization_memberships om
      on om.organization_id = p.organization_id
    where p.id = project_milestones.project_id
      and om.user_id = auth.uid()
  )
)
with check (
  organization_id = (
    select p.organization_id
    from public.projects p
    where p.id = project_milestones.project_id
  )
  and (
    exists (
      select 1
      from public.project_memberships pm
      where pm.project_id = project_milestones.project_id
        and pm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.projects p
      join public.organization_memberships om
        on om.organization_id = p.organization_id
      where p.id = project_milestones.project_id
        and om.user_id = auth.uid()
    )
  )
);

drop policy if exists "project_milestones_delete" on public.project_milestones;
create policy "project_milestones_delete"
on public.project_milestones
for delete
using (
  exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = project_milestones.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.projects p
    join public.organization_memberships om
      on om.organization_id = p.organization_id
    where p.id = project_milestones.project_id
      and om.user_id = auth.uid()
  )
);
