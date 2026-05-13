-- Ensure Storage bucket for report exports and scoped object policies.

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

create or replace function public.phi_extract_report_id_from_storage_object_name(object_name text)
returns uuid
language plpgsql
stable
as $$
declare
  report_part text;
begin
  -- Expected object name pattern inside bucket "reports": reports/<reportId>-v<version>.pdf
  if object_name is null or object_name = '' then
    return null;
  end if;

  if position('/' in object_name) > 0 then
    report_part := split_part(split_part(object_name, '/', 2), '-v', 1);
  else
    report_part := split_part(object_name, '-v', 1);
  end if;

  begin
    return report_part::uuid;
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
