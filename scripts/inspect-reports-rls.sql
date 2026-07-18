-- ============================================================================
-- Inspeção (somente leitura) — RLS de reports / report_versions
-- Objetivo: confirmar se o Consultor consegue INSERT (parecer do BLOCO 2.1).
-- Rode no banco REAL do Transparência Social (não no projeto vazio).
-- ============================================================================

-- 1) Existência das tabelas e funções auxiliares
select
  to_regclass('public.reports')             as reports,
  to_regclass('public.report_versions')     as report_versions,
  to_regproc('public.phi_can_access_project(uuid)')        as phi_can_access_project,
  to_regproc('public.user_has_report_access(uuid, uuid)')  as user_has_report_access,
  to_regproc('public.phi_is_project_consultant(uuid)')     as phi_is_project_consultant;

-- 2) Policies atuais (foco em INSERT / ALL)
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('reports', 'report_versions')
order by tablename, cmd, policyname;

-- 3) Definição das funções de acesso (para ver se incluem o caminho de consultor)
select p.proname, pg_get_functiondef(p.oid) as def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('phi_can_access_project', 'user_has_report_access', 'phi_is_project_consultant');
