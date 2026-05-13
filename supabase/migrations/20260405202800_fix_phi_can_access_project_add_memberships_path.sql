-- ROOT CAUSE (second layer):
-- phi_can_access_project did not check project_memberships.
--
-- Users who are directly added to a project (via project_memberships) could:
--   ✓ Open the project detail page (getProjectByIdForUser TS check passes via project_memberships)
--   ✗ NOT read reports (reports_select uses phi_can_access_project, which missed project_memberships)
--   ✗ NOT see financial data (getProjectFinancialAggregation first queries reports → blocked)
--
-- user_has_report_access (used by report_financial_items, report_receipts, report_bank_statements)
-- already checked project_memberships correctly — so financial sub-tables were readable but
-- unreachable because the reports query failed first.
--
-- Affected scenario: investor user added as a direct project participant (project_memberships)
-- for projects in an org they are NOT linked to via organization_investor_links.
-- They can open the project but see 0 reports and 0 financial data.
--
-- FIX: Add project_memberships as path 0 (highest priority) in phi_can_access_project,
-- making it consistent with user_has_report_access and getProjectByIdForUser.

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
  -- 0) Direct project membership (user was added as a project participant)?
  IF EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

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
