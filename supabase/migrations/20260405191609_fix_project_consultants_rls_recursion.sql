-- Fix infinite RLS recursion in project_consultants policies
--
-- The previous migration's INSERT/UPDATE/SELECT policies read from `projects`
-- inline. The `projects_select` policy reads from `project_consultants`.
-- This created a cycle:
--   INSERT on project_consultants
--     → policy reads projects (RLS)
--       → projects_select reads project_consultants (RLS)
--         → project_consultants policy reads projects (RLS) → ∞
--
-- Fix: extract the investor access check into a SECURITY DEFINER function.
-- Inside SECURITY DEFINER the owner is postgres (superuser) which bypasses RLS,
-- breaking the recursion — same pattern used for phi_can_access_report.

-- Step 1: Create SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.phi_investor_manages_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_investor_links oil
      ON oil.organization_id = p.organization_id
     AND oil.status = 'ACTIVE'
    JOIN public.investor_memberships im
      ON im.investor_id = oil.investor_id
    WHERE p.id = p_project_id
      AND im.user_id = auth.uid()
  );
$$;

-- Step 2: INSERT policy — investor can add consultants to their org's projects
DROP POLICY IF EXISTS "project_consultants_insert_by_investor" ON public.project_consultants;

CREATE POLICY "project_consultants_insert_by_investor"
ON public.project_consultants
FOR INSERT
TO public
WITH CHECK (
  public.phi_investor_manages_project(project_consultants.project_id)
);

-- Step 3: UPDATE policy — investor can deactivate consultants for their projects
DROP POLICY IF EXISTS "project_consultants_update_by_investor" ON public.project_consultants;

CREATE POLICY "project_consultants_update_by_investor"
ON public.project_consultants
FOR UPDATE
TO public
USING (
  public.phi_investor_manages_project(project_consultants.project_id)
)
WITH CHECK (
  public.phi_investor_manages_project(project_consultants.project_id)
);

-- Step 4: SELECT policy — investor can read consultant assignments for their projects
DROP POLICY IF EXISTS "project_consultants_select_by_investor" ON public.project_consultants;

CREATE POLICY "project_consultants_select_by_investor"
ON public.project_consultants
FOR SELECT
TO public
USING (
  public.phi_investor_manages_project(project_consultants.project_id)
);
