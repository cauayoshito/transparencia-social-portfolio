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

const GOAL_STATUS_RANK: Record<string, number> = {
  DONE: 0,
  IN_PROGRESS: 1,
  PLANNED: 2,
  BLOCKED: 3,
};

/**
 * Busca metas agregadas E detalhadas (sem N+1): retorna o resumo {total, done}
 * e a lista de metas com título, status, indicador, valor-alvo e projeto.
 */
async function fetchGoals(projectIds: string[], projetos: any[]) {
  const empty = { summary: { total: 0, done: 0 }, items: [] as any[] };
  if (projectIds.length === 0) return empty;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_goals")
      .select("id, title, status, indicator, target_value, project_id, sort_order")
      .in("project_id", projectIds);
    if (error || !data) return empty;

    const labelById = new Map<string, string>();
    for (const p of projetos) {
      const lbl = p.title ?? p.name ?? p.project_name ?? null;
      if (p.id && lbl) labelById.set(String(p.id), String(lbl));
    }

    const items = data
      .map((g: any) => ({
        id: String(g.id),
        title: (g.title as string | null) ?? null,
        status: (g.status as string | null) ?? null,
        indicator: (g.indicator as string | null) ?? null,
        target_value: (g.target_value as string | null) ?? null,
        sort_order: Number(g.sort_order ?? 0),
        project_label: labelById.get(String(g.project_id)) ?? null,
      }))
      .sort((a, b) => {
        const ra = GOAL_STATUS_RANK[String(a.status ?? "").toUpperCase()] ?? 2;
        const rb = GOAL_STATUS_RANK[String(b.status ?? "").toUpperCase()] ?? 2;
        return ra - rb || a.sort_order - b.sort_order;
      });

    const total = items.length;
    const done = items.filter(
      (g) => String(g.status ?? "").toUpperCase() === "DONE"
    ).length;

    return { summary: { total, done }, items };
  } catch {
    return empty;
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
      const [goals, milestonesSummary, organizacoes] = await Promise.all([
        fetchGoals(projectIds, projetos),
        fetchMilestonesSummary(projectIds),
        fetchOrganizationsFromProjects(projetos),
      ]);

      return (
        <DashboardInvestor
          nome={nome}
          projetos={projetos}
          relatorios={relatorios}
          goalsSummary={goals.summary}
          goals={goals.items}
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
      const [orgGoals, orgMilestonesSummary] = await Promise.all([
        fetchGoals(orgProjectIds, projetos),
        fetchMilestonesSummary(orgProjectIds),
      ]);

      return (
        <DashboardOrg
          nome={nome}
          projetos={projetos}
          relatorios={relatorios}
          goalsSummary={orgGoals.summary}
          goals={orgGoals.items}
          milestonesSummary={orgMilestonesSummary}
        />
      );
    }
  }
}
