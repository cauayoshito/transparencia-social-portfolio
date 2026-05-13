create extension if not exists pgcrypto;

create table if not exists public.institutional_entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('empresa', 'entidade_publica')),
  display_name text not null,
  legal_name text null,
  tax_id text null,
  contact_email text null,
  contact_phone text null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists institutional_entities_org_idx
  on public.institutional_entities (organization_id);

create unique index if not exists institutional_entities_org_name_type_idx
  on public.institutional_entities (
    organization_id,
    entity_type,
    lower(display_name)
  );

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
    where tgname = 'trg_institutional_entities_set_updated_at'
  ) then
    create trigger trg_institutional_entities_set_updated_at
      before update on public.institutional_entities
      for each row
      execute function public.phi_set_updated_at();
  end if;
end;
$$;

alter table public.projects
  add column if not exists linked_entity_name text null,
  add column if not exists linked_entity_type text null,
  add column if not exists linked_entity_id uuid null references public.institutional_entities(id) on delete set null;

create index if not exists projects_linked_entity_id_idx
  on public.projects (linked_entity_id);

insert into public.institutional_entities (
  organization_id,
  entity_type,
  display_name
)
select distinct
  p.organization_id,
  lower(trim(p.linked_entity_type)),
  trim(p.linked_entity_name)
from public.projects p
where nullif(trim(coalesce(p.linked_entity_name, '')), '') is not null
  and lower(trim(coalesce(p.linked_entity_type, ''))) in ('empresa', 'entidade_publica')
on conflict do nothing;

update public.projects p
set linked_entity_id = e.id
from public.institutional_entities e
where p.linked_entity_id is null
  and e.organization_id = p.organization_id
  and lower(trim(coalesce(p.linked_entity_type, ''))) = e.entity_type
  and lower(trim(coalesce(p.linked_entity_name, ''))) = lower(e.display_name);

update public.projects p
set linked_entity_name = e.display_name,
    linked_entity_type = e.entity_type
from public.institutional_entities e
where p.linked_entity_id = e.id
  and (
    nullif(trim(coalesce(p.linked_entity_name, '')), '') is null
    or nullif(trim(coalesce(p.linked_entity_type, '')), '') is null
  );

alter table public.projects
  drop constraint if exists projects_structured_entity_snapshot_check;

alter table public.projects
  add constraint projects_structured_entity_snapshot_check
  check (
    linked_entity_id is null
    or (
      nullif(trim(coalesce(linked_entity_name, '')), '') is not null
      and lower(trim(coalesce(linked_entity_type, ''))) in ('empresa', 'entidade_publica')
    )
  ) not valid;

alter table public.institutional_entities enable row level security;

drop policy if exists "institutional_entities_select" on public.institutional_entities;
create policy "institutional_entities_select"
on public.institutional_entities
for select
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = institutional_entities.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "institutional_entities_insert" on public.institutional_entities;
create policy "institutional_entities_insert"
on public.institutional_entities
for insert
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = institutional_entities.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "institutional_entities_update" on public.institutional_entities;
create policy "institutional_entities_update"
on public.institutional_entities
for update
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = institutional_entities.organization_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = institutional_entities.organization_id
      and om.user_id = auth.uid()
  )
);

drop function if exists public.create_project_secure(text, text, text, uuid, text, text);
drop function if exists public.create_project_secure(text, text, text, uuid, uuid);
drop function if exists public.create_project_secure(text, text, text, uuid, uuid, text, text);

create or replace function public.create_project_secure(
  p_name text,
  p_description text,
  p_project_type text,
  p_organization_id uuid,
  p_linked_entity_id uuid,
  p_linked_entity_name text,
  p_linked_entity_type text
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entity public.institutional_entities%rowtype;
  v_project public.projects%rowtype;
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Informe o nome do projeto.';
  end if;

  if nullif(trim(coalesce(p_project_type, '')), '') is null then
    raise exception 'Selecione o modelo do projeto.';
  end if;

  if p_organization_id is null then
    raise exception 'Selecione a organizacao do projeto.';
  end if;

  if p_linked_entity_id is null then
    raise exception 'Selecione uma entidade cadastrada para vincular ao projeto.';
  end if;

  if nullif(trim(coalesce(p_linked_entity_name, '')), '') is null then
    raise exception 'Nao foi possivel identificar o nome da entidade vinculada.';
  end if;

  if lower(trim(coalesce(p_linked_entity_type, ''))) not in ('empresa', 'entidade_publica') then
    raise exception 'Nao foi possivel identificar o tipo da entidade vinculada.';
  end if;

  if not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = p_organization_id
      and om.user_id = v_user_id
  ) then
    raise exception 'Voce nao tem acesso a organizacao selecionada.';
  end if;

  select *
  into v_entity
  from public.institutional_entities
  where id = p_linked_entity_id
    and organization_id = p_organization_id
    and status = 'ACTIVE'
  limit 1;

  if v_entity.id is null then
    raise exception 'Selecione uma entidade ativa da organizacao para continuar.';
  end if;

  if trim(v_entity.display_name) <> trim(p_linked_entity_name)
     or v_entity.entity_type <> lower(trim(p_linked_entity_type)) then
    raise exception 'Os dados da entidade selecionada ficaram desatualizados. Atualize a pagina e tente novamente.';
  end if;

  insert into public.projects (
    title,
    description,
    project_type,
    status,
    organization_id,
    created_by,
    linked_entity_id,
    linked_entity_name,
    linked_entity_type
  )
  values (
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    trim(p_project_type),
    'DRAFT',
    p_organization_id,
    v_user_id,
    v_entity.id,
    trim(p_linked_entity_name),
    lower(trim(p_linked_entity_type))
  )
  returning *
  into v_project;

  return v_project;
end;
$$;
