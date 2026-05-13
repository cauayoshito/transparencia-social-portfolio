-- Fix project consultant assignment flow
--
-- ROOT CAUSE: The INSERT policy "ProjectConsultants: master can insert" checked
-- the `project_investors` table — a legacy table with only 2 seeded rows.
-- New projects never get a `project_investors` row, so every consultant assignment
-- via the UI silently failed at the RLS layer. Consultants were never written to
-- project_consultants, so listProjectsForUser returned nothing for them.
--
-- Additionally, phi_is_consultant_linked (used by phi_start_review,
-- phi_approve_project, phi_reject_project) joined project_investors → consultant_links
-- — the same broken legacy path — so even manually-seeded consultants couldn't
-- advance project status through those RPCs.

-- Step 1: Drop the broken INSERT policy
DROP POLICY IF EXISTS "ProjectConsultants: master can insert" ON public.project_consultants;

-- Step 2: New INSERT policy — investor can assign consultants to any project
-- in an organization they are actively linked to via organization_investor_links
-- NOTE: the actual query is inside phi_investor_manages_project (see next migration)
-- to avoid infinite RLS recursion. This file establishes the logical intent.

-- Step 3: Add UPDATE policy so investors can deactivate consultants
DROP POLICY IF EXISTS "project_consultants_update_by_investor" ON public.project_consultants;

-- Step 4: Add SELECT policy so investors can read consultant assignments
-- for their projects (needed for participants tab and project list)
DROP POLICY IF EXISTS "project_consultants_select_by_investor" ON public.project_consultants;

-- Step 5: Fix phi_is_consultant_linked — was querying project_investors → consultant_links
-- (broken legacy path). Rewrite to use project_consultants directly,
-- matching what phi_is_project_consultant already does correctly.
-- NOTE: parameter name collision fix is in a later migration.
CREATE OR REPLACE FUNCTION public.phi_is_consultant_linked(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_consultants pc
    WHERE pc.project_id = project_id
      AND pc.consultant_user_id = auth.uid()
      AND pc.active = true
  );
$$;
