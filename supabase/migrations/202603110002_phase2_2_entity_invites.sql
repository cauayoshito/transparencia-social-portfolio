create extension if not exists pgcrypto;

create table if not exists public.institutional_entity_memberships (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.institutional_entities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('ENTITY_ADMIN', 'ENTITY_MEMBER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, user_id)
);

create table if not exists public.institutional_entity_invites (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.institutional_entities(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('ENTITY_ADMIN', 'ENTITY_MEMBER')),
  token uuid not null default gen_random_uuid(),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists institutional_entity_memberships_entity_idx
  on public.institutional_entity_memberships (entity_id);

create index if not exists institutional_entity_memberships_user_idx
  on public.institutional_entity_memberships (user_id);

create index if not exists institutional_entity_invites_entity_idx
  on public.institutional_entity_invites (entity_id);

create index if not exists institutional_entity_invites_org_idx
  on public.institutional_entity_invites (organization_id);

create unique index if not exists institutional_entity_invites_pending_email_idx
  on public.institutional_entity_invites (entity_id, lower(email))
  where status = 'PENDING';

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
    where tgname = 'trg_institutional_entity_memberships_set_updated_at'
  ) then
    create trigger trg_institutional_entity_memberships_set_updated_at
      before update on public.institutional_entity_memberships
      for each row
      execute function public.phi_set_updated_at();
  end if;
end;
$$;

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
    where tgname = 'trg_institutional_entity_invites_set_updated_at'
  ) then
    create trigger trg_institutional_entity_invites_set_updated_at
      before update on public.institutional_entity_invites
      for each row
      execute function public.phi_set_updated_at();
  end if;
end;
$$;

alter table public.institutional_entity_memberships enable row level security;
alter table public.institutional_entity_invites enable row level security;

drop policy if exists "institutional_entity_memberships_select" on public.institutional_entity_memberships;
create policy "institutional_entity_memberships_select"
on public.institutional_entity_memberships
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.institutional_entities e
    join public.organization_memberships om
      on om.organization_id = e.organization_id
    where e.id = institutional_entity_memberships.entity_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "institutional_entity_memberships_insert" on public.institutional_entity_memberships;
create policy "institutional_entity_memberships_insert"
on public.institutional_entity_memberships
for insert
with check (
  exists (
    select 1
    from public.institutional_entities e
    join public.organization_memberships om
      on om.organization_id = e.organization_id
    where e.id = institutional_entity_memberships.entity_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "institutional_entity_memberships_update" on public.institutional_entity_memberships;
create policy "institutional_entity_memberships_update"
on public.institutional_entity_memberships
for update
using (
  exists (
    select 1
    from public.institutional_entities e
    join public.organization_memberships om
      on om.organization_id = e.organization_id
    where e.id = institutional_entity_memberships.entity_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.institutional_entities e
    join public.organization_memberships om
      on om.organization_id = e.organization_id
    where e.id = institutional_entity_memberships.entity_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "institutional_entity_invites_select" on public.institutional_entity_invites;
create policy "institutional_entity_invites_select"
on public.institutional_entity_invites
for select
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = institutional_entity_invites.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "institutional_entity_invites_insert" on public.institutional_entity_invites;
create policy "institutional_entity_invites_insert"
on public.institutional_entity_invites
for insert
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = institutional_entity_invites.organization_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists "institutional_entity_invites_update" on public.institutional_entity_invites;
create policy "institutional_entity_invites_update"
on public.institutional_entity_invites
for update
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = institutional_entity_invites.organization_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = institutional_entity_invites.organization_id
      and om.user_id = auth.uid()
  )
);

drop function if exists public.create_institutional_entity_invite(uuid, text, text, integer);
create or replace function public.create_institutional_entity_invite(
  p_entity_id uuid,
  p_email text,
  p_role text default 'ENTITY_MEMBER',
  p_expires_in_days integer default 7
)
returns table (
  invite_id uuid,
  token uuid,
  expires_at timestamptz,
  entity_id uuid,
  organization_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := upper(trim(coalesce(p_role, 'ENTITY_MEMBER')));
  v_entity public.institutional_entities%rowtype;
  v_existing_user_id uuid;
  v_invite public.institutional_entity_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_entity_id is null then
    raise exception 'entity is required';
  end if;

  if v_email = '' then
    raise exception 'email is required';
  end if;

  if v_role not in ('ENTITY_ADMIN', 'ENTITY_MEMBER') then
    raise exception 'invalid entity invite role';
  end if;

  if p_expires_in_days is null or p_expires_in_days < 1 or p_expires_in_days > 90 then
    raise exception 'invalid invite expiration';
  end if;

  select *
  into v_entity
  from public.institutional_entities e
  where e.id = p_entity_id
  limit 1;

  if v_entity.id is null then
    raise exception 'entity not found';
  end if;

  if not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = v_entity.organization_id
      and om.user_id = v_user_id
  ) then
    raise exception 'not allowed';
  end if;

  select p.id
  into v_existing_user_id
  from public.profiles p
  join public.institutional_entity_memberships m
    on m.user_id = p.id
   and m.entity_id = p_entity_id
   and m.status = 'ACTIVE'
  where lower(coalesce(p.email, '')) = v_email
  limit 1;

  if v_existing_user_id is not null then
    raise exception 'email already linked to entity membership';
  end if;

  insert into public.institutional_entity_invites (
    entity_id,
    organization_id,
    email,
    role,
    expires_at,
    created_by,
    updated_by
  )
  values (
    p_entity_id,
    v_entity.organization_id,
    v_email,
    v_role,
    now() + make_interval(days => p_expires_in_days),
    v_user_id,
    v_user_id
  )
  returning *
  into v_invite;

  invite_id := v_invite.id;
  token := v_invite.token;
  expires_at := v_invite.expires_at;
  entity_id := v_invite.entity_id;
  organization_id := v_invite.organization_id;

  return next;
end;
$$;

drop function if exists public.accept_institutional_entity_invite(uuid);
create or replace function public.accept_institutional_entity_invite(
  p_token uuid
)
returns table (
  entity_id uuid,
  organization_id uuid,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite public.institutional_entity_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select lower(trim(coalesce(u.email, '')))
  into v_user_email
  from auth.users u
  where u.id = v_user_id;

  if coalesce(v_user_email, '') = '' then
    raise exception 'user email not found';
  end if;

  select *
  into v_invite
  from public.institutional_entity_invites i
  where i.token = p_token
  limit 1;

  if v_invite.id is null then
    raise exception 'invalid invite token';
  end if;

  if v_invite.status = 'ACCEPTED' then
    raise exception 'invite already accepted';
  end if;

  if v_invite.status = 'REVOKED' then
    raise exception 'invite revoked';
  end if;

  if v_invite.expires_at < now() then
    update public.institutional_entity_invites
    set status = 'EXPIRED',
        updated_by = v_user_id,
        updated_at = now()
    where id = v_invite.id;

    raise exception 'invite expired';
  end if;

  if lower(trim(coalesce(v_invite.email, ''))) <> v_user_email then
    raise exception 'invite email does not match logged user';
  end if;

  insert into public.institutional_entity_memberships (
    entity_id,
    user_id,
    role,
    status,
    created_by,
    updated_by
  )
  values (
    v_invite.entity_id,
    v_user_id,
    v_invite.role,
    'ACTIVE',
    v_invite.created_by,
    v_user_id
  )
  on conflict (entity_id, user_id)
  do update set
    role = excluded.role,
    status = 'ACTIVE',
    updated_by = v_user_id,
    updated_at = now();

  update public.institutional_entity_invites
  set status = 'ACCEPTED',
      accepted_at = now(),
      updated_by = v_user_id,
      updated_at = now()
  where id = v_invite.id;

  entity_id := v_invite.entity_id;
  organization_id := v_invite.organization_id;
  role := v_invite.role;

  return next;
end;
$$;
