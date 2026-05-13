-- Fix phi_can_access_project: investor path was checking project_investors (legacy, ~2 rows)
-- instead of organization_investor_links (real table).
--
-- ROOT CAUSE: investors couldn't read any rows from `reports` because the
-- "reports_select" RLS policy delegates to phi_can_access_project, and that function's
-- investor branch checked the empty legacy table → returned false → RLS blocked the query →
-- getProjectFinancialAggregation got an empty reports list → returned all zeros.
--
-- FIX 1: rewrite phi_can_access_project investor path to use organization_investor_links
-- FIX 2: drop the redundant old policy "Reports: select if can access project" which
--         duplicated the same broken investor check inline. The newer "reports_select"
--         policy (which calls phi_can_access_project) is the canonical one going forward.

CREATE OR REPLACE FUNCTION public.phi_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- pega organização do projeto
  SELECT organization_id INTO v_org_id
  FROM public.projects
  WHERE id = p_project_id;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1) é membro da organização executora?
  IF EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.organization_id = v_org_id
      AND om.user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  -- 2) é investidor vinculado via organization_investor_links (active)?
  --    (replaces broken project_investors legacy table check)
  IF EXISTS (
    SELECT 1
    FROM public.organization_investor_links oil
    JOIN public.investor_memberships im ON im.investor_id = oil.investor_id
    WHERE oil.organization_id = v_org_id
      AND oil.status = 'ACTIVE'
      AND im.user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  -- 3) é consultor vinculado e ativo?
  IF EXISTS (
    SELECT 1
    FROM public.project_consultants pc
    WHERE pc.project_id = p_project_id
      AND pc.consultant_user_id = auth.uid()
      AND pc.active = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Drop the old inline SELECT policy that independently checked project_investors.
-- The "reports_select" policy (using phi_can_access_project above) is now sufficient.
DROP POLICY IF EXISTS "Reports: select if can access project" ON public.reports;
