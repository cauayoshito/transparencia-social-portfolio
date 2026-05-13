-- Reinforce Storage report policies using UUID-safe extraction to avoid 22P02 casts.

create or replace function public.phi_extract_report_id_from_storage_object_name(object_name text)
returns uuid
language plpgsql
stable
as $$
declare
  extracted text;
begin
  if object_name is null or object_name = '' then
    return null;
  end if;

  -- Supports object names like "<report_id>/v2.pdf" and legacy "reports/<report_id>-v2.pdf".
  extracted := substring(object_name from '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})');

  if extracted is null then
    return null;
  end if;

  begin
    return extracted::uuid;
  exception
    when others then
      return null;
  end;
end;
$$;

alter table storage.objects enable row level security;

drop policy if exists "phi_reports_storage_select" on storage.objects;
create policy "phi_reports_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'reports'
  and (
    to_regprocedure('public.phi_can_access_report(uuid)') is null
    or public.phi_can_access_report(public.phi_extract_report_id_from_storage_object_name(name))
  )
);

drop policy if exists "phi_reports_storage_insert" on storage.objects;
create policy "phi_reports_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reports'
  and auth.uid() is not null
  and (
    to_regprocedure('public.phi_can_access_report(uuid)') is null
    or public.phi_can_access_report(public.phi_extract_report_id_from_storage_object_name(name))
  )
);
