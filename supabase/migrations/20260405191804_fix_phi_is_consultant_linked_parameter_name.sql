-- Fix parameter name collision in phi_is_consultant_linked
--
-- In LANGUAGE sql functions, PostgreSQL resolves unqualified names by looking
-- at column names from the FROM clause first, then function parameters.
-- The previous version had:
--
--   CREATE FUNCTION phi_is_consultant_linked(project_id uuid) ...
--   WHERE pc.project_id = project_id   ← `project_id` resolved as pc.project_id (column!)
--
-- This made the predicate `pc.project_id = pc.project_id` — always TRUE.
-- The function returned true whenever the consultant had ANY active project,
-- ignoring the specific project_id argument. A security hole and logic bug.
--
-- Fix: rename the parameter from `project_id` to `p_project_id` (no collision).
-- Requires DROP + CREATE because PostgreSQL forbids renaming parameters in-place.

DROP FUNCTION IF EXISTS public.phi_is_consultant_linked(uuid);

CREATE FUNCTION public.phi_is_consultant_linked(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_consultants pc
    WHERE pc.project_id = p_project_id
      AND pc.consultant_user_id = auth.uid()
      AND pc.active = true
  );
$$;
