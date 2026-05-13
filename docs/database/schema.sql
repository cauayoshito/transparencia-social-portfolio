--
-- SQL migrations for the PHI – Sistema de Gerenciamento
--
-- This script sets up the necessary tables and row level security (RLS)
-- policies in Supabase. Run these statements in your Supabase project to
-- provision the database schema. Adjust according to your environment
-- and naming conventions. Supabase will automatically create the
-- `auth.users` table used below when authentication is enabled.

-- Enumerations for roles and project status
create type if not exists role as enum ('org', 'investor', 'consultant');
create type if not exists project_status as enum ('draft', 'in_review', 'changes_requested', 'approved');

-- Organizations table
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- Profiles table linked to auth.users
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role role not null default 'org',
  organization_id uuid references organizations (id),
  created_at timestamptz default now()
);

-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'draft',
  start_date date,
  end_date date,
  value_total numeric,
  created_at timestamptz default now()
);

-- Enable row level security on tables
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table projects enable row level security;

--
-- Row Level Security Policies
--

-- Profiles: users can view and update only their own profile
create policy "profiles read access" on profiles
  for select using (auth.uid() = id);

create policy "profiles update access" on profiles
  for update using (auth.uid() = id);

-- Organizations: org users see only their organization; others see all
create policy "organization access" on organizations
  for select using (
    (
      exists (
        select 1
        from profiles p
        where p.id = auth.uid() and p.role = 'org' and p.organization_id = organizations.id
      )
    )
    or (
      exists (
        select 1
        from profiles p
        where p.id = auth.uid() and p.role != 'org'
      )
    )
  );

-- Projects: org users see only their projects; investors and consultants see all
create policy "projects org view" on projects
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'org' and p.organization_id = projects.organization_id
    )
  );

create policy "projects investor view" on projects
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'investor'
    )
  );

create policy "projects consultant read" on projects
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'consultant'
    )
  );

-- Optionally restrict inserts and updates for projects to org users only
create policy "projects org insert" on projects
  for insert with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'org' and p.organization_id = projects.organization_id
    )
  );

create policy "projects org update" on projects
  for update using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'org' and p.organization_id = projects.organization_id
    )
  );

-- After defining policies, it is good practice to enable RLS on each table
-- if it hasn't been enabled yet. The earlier `alter table ... enable row level security` statements do this.