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

/** Busca goals agregados para uma lista de projetos (sem N+1) */
async function fetchGoalsSummary(projectIds: string[]) {
  if (projectIds.length === 0) return { total: 0, done: 0 };
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_goals")
      .select("id, status")
      .in("project_id", projectIds);
    if (error || !data) return { total: 0, done: 0 };
    const total = data.length;
    const done = data.filter(
      (g: any) => String(g.status ?? "").toUpperCase() === "DONE"
    ).length;
    return { total, done };
  } catch {
    return { total: 0, done: 0 };
  }
}

/** Busca milestones agregados para uma lista de projetos (sem N+1) */
async function fetchMilestonesSummary(projectIds: string[]) {
  if (projectIds.length === 0) return { total: 0, done: 0 };
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_milestones")
      .select("id, status")
      .in("project_id", projectIds);
    if (error || !data) return { total: 0, done: 0 };
    const total = data.length;
    const done = data.filter(
      (m: any) => String(m.status ?? "").toUpperCase() === "DONE"
    ).length;
    return { total, done };
  } catch {
    return { total: 0, done: 0 };
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
      const [goalsSummary, milestonesSummary, organizacoes] = await Promise.all(
        [
          fetchGoalsSummary(projectIds),
          fetchMilestonesSummary(projectIds),
          fetchOrganizationsFromProjects(projetos),
        ]
      );

      return (
        <DashboardInvestor
          nome={nome}
          projetos={projetos}
          relatorios={relatorios}
          goalsSummary={goalsSummary}
          milestonesSummary={milestonesSummary}
          organizacoes={organizacoes}
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
      const [orgGoalsSummary, orgMilestonesSummary] = await Promise.all([
        fetchGoalsSummary(orgProjectIds),
        fetchMilestonesSummary(orgProjectIds),
      ]);

      return (
        <DashboardOrg
          nome={nome}
          projetos={projetos}
          relatorios={relatorios}
          goalsSummary={orgGoalsSummary}
          milestonesSummary={orgMilestonesSummary}
        />
      );
    }
  }
}
