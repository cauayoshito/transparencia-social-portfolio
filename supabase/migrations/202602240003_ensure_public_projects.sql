-- Ensure public.projects exists with the columns used by the app types/services.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  project_type text not null,
  status text not null default 'DRAFT',
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid null references auth.users(id) on delete set null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.phi_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_projects_set_updated_at'
  ) then
    create trigger trg_projects_set_updated_at
      before update on public.projects
      for each row
      execute function public.phi_set_updated_at();
  end if;
end;
$$;

alter table public.projects enable row level security;
