-- Fix consultant access to report_versions
-- Reason: consultants were seeing "Nenhuma versão encontrada" even on reports they
-- should be able to read, because two functions had broken logic:
--   1. phi_is_project_consultant queried consultant_links (investor-linked table)
--      instead of project_consultants (direct assignment table)
--   2. phi_can_access_report was not SECURITY DEFINER, causing an RLS chain failure
--      when the function tried to read reports (also RLS-protected) on behalf of a consultant

-- FIX 1: phi_is_project_consultant — check project_consultants directly
CREATE OR REPLACE FUNCTION public.phi_is_project_consultant(proj_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_consultants pc
    WHERE pc.project_id = proj_id
      AND pc.consultant_user_id = auth.uid()
      AND pc.active = true
  );
$$;

-- FIX 2: phi_can_access_report — make SECURITY DEFINER to break the RLS chain
CREATE OR REPLACE FUNCTION public.phi_can_access_report(rid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = rid AND (
      public.phi_is_org_member(p.organization_id)
      OR public.phi_is_project_investor(p.id)
      OR public.phi_is_project_consultant(p.id)
    )
  );
$$;
