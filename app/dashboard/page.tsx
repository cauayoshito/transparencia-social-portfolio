import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole } from "@/lib/roles";
import { nomeDoEmail } from "@/lib/dashboard-helpers";
import { createClient } from "@/lib/supabase/server";
import { listProjectsForUser } from "@/services/projects.service";
import { listReportsForUser } from "@/services/reports.service";
import { listOrganizationsForUser } from "@/services/organizations.service";
import DashboardInvestor from "@/components/dashboard/DashboardInvestor";
import DashboardOrg from "@/components/dashboard/DashboardOrg";
import DashboardConsultor from "@/components/dashboard/DashboardConsultor";

export const dynamic = "force-dynamic";

/** Lista metas (goals) com vínculo de projeto para alimentar filtros do painel */
async function fetchGoalsList(projectIds: string[]) {
  if (projectIds.length === 0)
    return [] as Array<{
      id: string;
      project_id: string;
      status: string;
      title: string;
    }>;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_goals")
      .select("id, project_id, status, title")
      .in("project_id", projectIds);
    if (error || !data) return [];
    return data.map((g: any) => ({
      id: String(g.id),
      project_id: String(g.project_id),
      status: String(g.status ?? ""),
      title: String(g.title ?? "Meta sem título"),
    }));
  } catch {
    return [];
  }
}

/** Lista marcos (milestones) com vínculo de projeto/meta para filtros do painel */
async function fetchMilestonesList(projectIds: string[]) {
  if (projectIds.length === 0)
    return [] as Array<{
      id: string;
      project_id: string;
      status: string;
      goal_id: string | null;
    }>;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_milestones")
      .select("id, project_id, status, goal_id")
      .in("project_id", projectIds);
    if (error || !data) return [];
    return data.map((m: any) => ({
      id: String(m.id),
      project_id: String(m.project_id),
      status: String(m.status ?? ""),
      goal_id: m.goal_id ? String(m.goal_id) : null,
    }));
  } catch {
    return [];
  }
}

/** Busca organizações a partir dos organization_ids dos projetos */
async function fetchOrganizationsFromProjects(projetos: any[]) {
  const orgIds = Array.from(
    new Set(
      projetos.map((p: any) => p.organization_id).filter(Boolean) as string[]
    )
  );
  if (orgIds.length === 0) return [];
  try {
    return await listOrganizationsForUser(orgIds);
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const user = await requireUser();
  const nome = nomeDoEmail(user.email);

  // Resolve perfil (fallback ORG se falhar)
  let role: ReturnType<typeof getPrimaryRole> = "ORG";
  try {
    const ctx = await getUserContext(user.id);
    role = getPrimaryRole(ctx);
  } catch {
    // mantém ORG como fallback
  }

  // Busca dados (compartilhado entre os 3 painéis)
  let projetos: any[] = [];
  let relatorios: any[] = [];

  try {
    projetos = await listProjectsForUser(user.id);
  } catch {
    projetos = [];
  }

  try {
    relatorios = await listReportsForUser(user.id);
  } catch {
    relatorios = [];
  }

  // Renderiza o dashboard correto por perfil
  switch (role) {
    case "INVESTOR": {
      // Dados extras para o painel do financiador
      const projectIds = projetos.map((p: any) => p.id).filter(Boolean);
      const [organizacoes, invGoalsList, invMilestonesList] = await Promise.all([
        fetchOrganizationsFromProjects(projetos),
        fetchGoalsList(projectIds),
        fetchMilestonesList(projectIds),
      ]);

      return (
        <DashboardInvestor
          nome={nome}
          projetos={projetos}
          relatorios={relatorios}
          organizacoes={organizacoes}
          goalsList={invGoalsList}
          milestonesList={invMilestonesList}
        />
      );
    }

    case "CONSULTANT":
      return (
        <DashboardConsultor
          nome={nome}
          projetos={projetos}
          relatorios={relatorios}
        />
      );

    case "ORG":
    default: {
      // Dados extras para o painel da organização
      const orgProjectIds = projetos.map((p: any) => p.id).filter(Boolean);
      const [orgGoalsList, orgMilestonesList, orgOrganizacoes] =
        await Promise.all([
          fetchGoalsList(orgProjectIds),
          fetchMilestonesList(orgProjectIds),
          fetchOrganizationsFromProjects(projetos),
        ]);

      return (
        <DashboardOrg
          nome={nome}
          projetos={projetos}
          relatorios={relatorios}
          goalsList={orgGoalsList}
          milestonesList={orgMilestonesList}
          organizacoes={orgOrganizacoes}
        />
      );
    }
  }
}
