import { createClient } from "@/lib/supabase/server";
import { getInstitutionalEntityByIdForOrganization } from "@/services/institutional-entities.service";
import { getOrganizationMemberships } from "@/services/membership.service";
import type { Database, Json } from "@/types/database";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

type ProjectMembershipInsert = {
  project_id: string;
  user_id: string;
  role: "OWNER" | "INVESTOR";
  created_by?: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type ProjectParticipantRow = {
  user_id: string;
  role: "OWNER" | "CONSULTANT" | "INVESTOR";
  created_at?: string | null;
  full_name: string | null;
  email: string | null;
};

export type CreateProjectInput = {
  title: string;
  description?: string | null;
  project_type: string;
  status?: string;
  organization_id?: string;
  linked_entity_id: string;
  metadata?: Json;
};

function normalizeRole(role: string | null | undefined): string {
  return (role ?? "").trim().toUpperCase();
}

function serviceError(base: string, raw: unknown, context: string) {
  const anyRaw = raw as { message?: string } | null;
  const msg =
    raw instanceof Error
      ? raw.message
      : typeof anyRaw?.message === "string"
        ? anyRaw.message
        : typeof raw === "string"
          ? raw
          : JSON.stringify(raw);

  return new Error(`${base} [context: ${context}]: ${msg}`);
}

async function upsertProjectMembership(
  membership: ProjectMembershipInsert,
): Promise<void> {
  const supabase = createClient();
  const db = supabase as any;

  const { error } = await db
    .schema("public")
    .from("project_memberships")
    .upsert(
      {
        project_id: membership.project_id,
        user_id: membership.user_id,
        role: membership.role,
        created_by: membership.created_by ?? null,
      },
      {
        onConflict: "project_id,user_id",
        ignoreDuplicates: false,
      },
    );

  if (error) {
    throw serviceError(
      "Falha ao vincular participante ao projeto",
      error,
      "project_memberships.upsert",
    );
  }
}

/**
 * Helper: resolve organization IDs the investor has access to via
 * investor_memberships → organization_investor_links.
 * Returns an array of organization_id strings (may be empty).
 */
async function getInvestorOrgIds(userId: string): Promise<string[]> {
  const supabase = createClient();
  const db = supabase as any;

  // 1. Get investor_id(s) for this user
  const { data: memberships, error: memErr } = await db
    .schema("public")
    .from("investor_memberships")
    .select("investor_id")
    .eq("user_id", userId);

  if (memErr || !memberships || memberships.length === 0) return [];

  const investorIds = memberships
    .map((m: any) => m.investor_id)
    .filter(Boolean);
  if (investorIds.length === 0) return [];

  // 2. Get organization_ids linked to those investors
  const { data: links, error: linkErr } = await db
    .schema("public")
    .from("organization_investor_links")
    .select("organization_id")
    .in("investor_id", investorIds)
    .eq("status", "ACTIVE");

  if (linkErr || !links) return [];

  return links.map((l: any) => l.organization_id).filter(Boolean) as string[];
}

export async function listProjectsForUser(
  userId: string,
): Promise<ProjectRow[]> {
  const supabase = createClient();
  const db = supabase as any;

  // Path 1: project_memberships (ORG owner, manually added participants)
  const membershipRes = await db
    .schema("public")
    .from("project_memberships")
    .select("project_id")
    .eq("user_id", userId);

  if (membershipRes.error) {
    throw serviceError(
      "Falha ao buscar participacoes do projeto",
      membershipRes.error,
      "project_memberships.select",
    );
  }

  // Path 2: project_consultants (consultant assigned to project)
  const consultantRes = await db
    .schema("public")
    .from("project_consultants")
    .select("project_id")
    .eq("consultant_user_id", userId)
    .eq("active", true);

  if (consultantRes.error) {
    throw serviceError(
      "Falha ao buscar projetos como consultor",
      consultantRes.error,
      "project_consultants.select",
    );
  }

  // Collect IDs from path 1 + 2
  const directIds = new Set(
    [
      ...(membershipRes.data ?? []).map((m: any) => m.project_id),
      ...(consultantRes.data ?? []).map((c: any) => c.project_id),
    ].filter(Boolean),
  );

  // Path 3: investor — investor_memberships → organization_investor_links → projects by org
  const investorOrgIds = await getInvestorOrgIds(userId);
  let investorProjectIds: string[] = [];

  if (investorOrgIds.length > 0) {
    const { data: orgProjects, error: orgProjErr } = await db
      .schema("public")
      .from("projects")
      .select("id")
      .in("organization_id", investorOrgIds);

    if (!orgProjErr && orgProjects) {
      investorProjectIds = orgProjects.map((p: any) => p.id).filter(Boolean);
    }
  }

  const projectIds = Array.from(new Set([...directIds, ...investorProjectIds]));

  if (projectIds.length === 0) return [];

  const { data, error } = await db
    .schema("public")
    .from("projects")
    .select("*")
    .in("id", projectIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw serviceError("Falha ao listar projetos", error, "projects.select");
  }

  return (data ?? []) as ProjectRow[];
}

export async function getProjectByIdForUser(
  projectId: string,
  userId: string,
): Promise<ProjectRow | null> {
  const supabase = createClient();
  const db = supabase as any;

  // Path 1: project_memberships
  const membershipRes = await db
    .schema("public")
    .from("project_memberships")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipRes.error) {
    throw serviceError(
      "Falha ao validar acesso ao projeto",
      membershipRes.error,
      "project_memberships.accessCheck",
    );
  }

  // Path 2: project_consultants
  const consultantRes = await db
    .schema("public")
    .from("project_consultants")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("consultant_user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (consultantRes.error) {
    throw serviceError(
      "Falha ao validar acesso do consultor ao projeto",
      consultantRes.error,
      "project_consultants.accessCheck",
    );
  }

  let hasAccess = Boolean(membershipRes.data || consultantRes.data);

  // Path 3: investor — check if user's investor org is linked to this project's org
  if (!hasAccess) {
    const investorOrgIds = await getInvestorOrgIds(userId);
    if (investorOrgIds.length > 0) {
      const { data: proj } = await db
        .schema("public")
        .from("projects")
        .select("organization_id")
        .eq("id", projectId)
        .maybeSingle();

      if (proj && investorOrgIds.includes(proj.organization_id)) {
        hasAccess = true;
      }
    }
  }

  if (!hasAccess) return null;

  const { data, error } = await db
    .schema("public")
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw serviceError("Erro ao buscar projeto", error, "projects.selectById");
  }

  return (data as ProjectRow | null) ?? null;
}

export async function createProject(
  payload: CreateProjectInput,
  userId?: string,
): Promise<ProjectRow> {
  const supabase = createClient();
  const db = supabase as any;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw serviceError(
      "Usuario nao autenticado",
      authError ?? "Sem user",
      "auth.getUser()",
    );
  }

  const effectiveUserId = userId ?? user.id;
  let organizationId = payload.organization_id?.trim() || null;

  if (!organizationId) {
    const memberships = await getOrganizationMemberships(effectiveUserId);
    const orgAdminMembership = memberships.find(
      (membership) => normalizeRole(membership.role) === "ORG_ADMIN",
    );
    organizationId = orgAdminMembership?.organization_id ?? null;
  }

  if (!organizationId) {
    throw new Error("Nao foi possivel determinar a organizacao do projeto.");
  }

  const linkedEntityId = String(payload.linked_entity_id ?? "").trim();

  if (!linkedEntityId) {
    throw new Error(
      "Selecione um financiador cadastrado para criar o projeto.",
    );
  }

  const linkedEntity = await getInstitutionalEntityByIdForOrganization(
    linkedEntityId,
    organizationId,
  );

  if (!linkedEntity) {
    throw new Error(
      "Selecione um financiador cadastrado da organizacao para continuar.",
    );
  }

  if (String(linkedEntity.status ?? "").toUpperCase() !== "ACTIVE") {
    throw new Error(
      "O financiador selecionado nao esta ativo para novos projetos.",
    );
  }

  const linkedEntityName = String(linkedEntity.display_name ?? "").trim();
  const linkedEntityType = String(linkedEntity.entity_type ?? "")
    .trim()
    .toLowerCase();

  if (!linkedEntityName || !linkedEntityType) {
    throw new Error(
      "O financiador selecionado nao possui dados suficientes para vincular ao projeto.",
    );
  }

  const rpcResponse = await db.rpc("create_project_secure", {
    p_name: payload.title,
    p_description: payload.description ?? null,
    p_project_type: payload.project_type,
    p_organization_id: organizationId,
    p_linked_entity_id: linkedEntity.id,
    p_linked_entity_name: linkedEntityName,
    p_linked_entity_type: linkedEntityType,
  });

  const error = rpcResponse.error;
  const data = rpcResponse.data as ProjectRow | null;

  if (error) {
    console.error("create_project_secure rpc error", error);
    throw serviceError(
      "Falha ao criar projeto",
      error,
      "create_project_secure",
    );
  }

  if (!data?.id) {
    throw new Error(
      "A funcao create_project_secure nao retornou um projeto valido.",
    );
  }

  await upsertProjectMembership({
    project_id: data.id,
    user_id: effectiveUserId,
    role: "OWNER",
    created_by: effectiveUserId,
  });

  return data;
}

export async function getProjectsByOrganization(
  organization_id: string,
): Promise<ProjectRow[]> {
  const supabase = createClient();
  const db = supabase as any;

  const { data, error } = await db
    .schema("public")
    .from("projects")
    .select("*")
    .eq("organization_id", organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    throw serviceError("Erro ao buscar projetos", error, "projects.select");
  }

  return (data ?? []) as ProjectRow[];
}

export async function updateProjectStatus(
  projectId: string,
  status: string,
): Promise<ProjectRow> {
  const supabase = createClient();
  const db = supabase as any;

  const { data, error } = await db
    .schema("public")
    .from("projects")
    .update({ status })
    .eq("id", projectId)
    .select("*")
    .single();

  if (error) {
    throw serviceError(
      "Erro ao atualizar status do projeto",
      error,
      "projects.update",
    );
  }

  return data as ProjectRow;
}

export async function getProjectById(projectId: string): Promise<ProjectRow> {
  const supabase = createClient();
  const db = supabase as any;

  const { data, error } = await db
    .schema("public")
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    throw serviceError("Erro ao buscar projeto", error, "projects.selectById");
  }

  return data as ProjectRow;
}

export async function listProjectParticipants(
  projectId: string,
): Promise<ProjectParticipantRow[]> {
  const supabase = createClient();
  const db = supabase as any;

  const membershipRes = await db
    .schema("public")
    .from("project_memberships")
    .select("user_id, role, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (membershipRes.error) {
    throw serviceError(
      "Falha ao listar participantes do projeto",
      membershipRes.error,
      "project_memberships.selectParticipants",
    );
  }

  const consultantRes = await db
    .schema("public")
    .from("project_consultants")
    .select("consultant_user_id, active, created_at")
    .eq("project_id", projectId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (consultantRes.error) {
    throw serviceError(
      "Falha ao listar consultores do projeto",
      consultantRes.error,
      "project_consultants.selectParticipants",
    );
  }

  const memberships = (membershipRes.data ?? []) as any[];
  const consultants = (consultantRes.data ?? []) as any[];

  const normalizedMembers = memberships.map((membership) => ({
    user_id: membership.user_id,
    role: membership.role,
    created_at: membership.created_at ?? null,
  }));

  const normalizedConsultants = consultants
    .filter(
      (c) =>
        c.consultant_user_id &&
        !normalizedMembers.some((m) => m.user_id === c.consultant_user_id),
    )
    .map((c) => ({
      user_id: c.consultant_user_id,
      role: "CONSULTANT",
      created_at: c.created_at ?? null,
    }));

  const participants = [...normalizedMembers, ...normalizedConsultants];

  if (participants.length === 0) return [];

  const userIds = participants.map((participant) => participant.user_id);

  const profilesRes = await db
    .schema("public")
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profilesRes.error) {
    throw serviceError(
      "Falha ao buscar perfis dos participantes",
      profilesRes.error,
      "profiles.selectParticipants",
    );
  }

  const profilesMap = new Map<string, ProfileRow>(
    (profilesRes.data ?? []).map((profile: any) => [
      profile.id,
      {
        id: profile.id,
        full_name: profile.full_name ?? null,
        email: profile.email ?? null,
      },
    ]),
  );

  return participants.map((participant) => {
    const profile = profilesMap.get(participant.user_id);
    return {
      user_id: participant.user_id,
      role: participant.role as ProjectParticipantRow["role"],
      created_at: participant.created_at,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    };
  });
}

export async function addProjectParticipant(
  projectId: string,
  userId: string,
  role: "CONSULTANT" | "INVESTOR" | "VIEWER",
  createdBy?: string,
): Promise<void> {
  const supabase = createClient();
  const db = supabase as any;

  if (role === "CONSULTANT") {
    const { error } = await db
      .schema("public")
      .from("project_consultants")
      .upsert(
        {
          project_id: projectId,
          consultant_user_id: userId,
          active: true,
        },
        {
          onConflict: "project_id,consultant_user_id",
          ignoreDuplicates: false,
        },
      );

    if (error) {
      throw serviceError(
        "Falha ao vincular consultor ao projeto",
        error,
        "project_consultants.upsert",
      );
    }

    return;
  }

  await upsertProjectMembership({
    project_id: projectId,
    user_id: userId,
    role: "INVESTOR",
    created_by: createdBy ?? null,
  });
}

/**
 * Lista consultores disponíveis para atribuição a um projeto.
 * Busca em consultant_links os consultores vinculados ao investor do usuário,
 * filtrando os que já estão ativos no projeto.
 */
export async function listAvailableConsultantsForProject(
  investorId: string,
  projectId: string,
): Promise<Array<{ user_id: string; full_name: string | null; email: string | null }>> {
  const supabase = createClient();
  const db = supabase as any;

  // 1. Buscar consultores ativos vinculados a este investidor
  const { data: links, error: linkErr } = await db
    .schema("public")
    .from("consultant_links")
    .select("consultant_user_id")
    .eq("investor_id", investorId)
    .eq("is_active", true);

  if (linkErr) {
    throw serviceError(
      "Falha ao buscar consultores do investidor",
      linkErr,
      "consultant_links.select",
    );
  }

  if (!links || links.length === 0) return [];

  const allConsultantIds = links.map((l: any) => l.consultant_user_id).filter(Boolean);

  // 2. Filtrar os que já estão ativos neste projeto
  const { data: alreadyAssigned, error: assignErr } = await db
    .schema("public")
    .from("project_consultants")
    .select("consultant_user_id")
    .eq("project_id", projectId)
    .eq("active", true);

  if (assignErr) {
    throw serviceError(
      "Falha ao verificar consultores já atribuídos",
      assignErr,
      "project_consultants.select",
    );
  }

  const assignedIds = new Set(
    (alreadyAssigned ?? []).map((a: any) => a.consultant_user_id),
  );

  const availableIds = allConsultantIds.filter((id: string) => !assignedIds.has(id));

  if (availableIds.length === 0) return [];

  // 3. Buscar perfis
  const { data: profiles, error: profErr } = await db
    .schema("public")
    .from("profiles")
    .select("id, full_name, email")
    .in("id", availableIds);

  if (profErr) {
    throw serviceError(
      "Falha ao buscar perfis dos consultores",
      profErr,
      "profiles.selectConsultants",
    );
  }

  return (profiles ?? []).map((p: any) => ({
    user_id: p.id as string,
    full_name: (p.full_name ?? null) as string | null,
    email: (p.email ?? null) as string | null,
  }));
}

export async function removeProjectParticipant(
  projectId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  const db = supabase as any;

  const currentRes = await db
    .schema("public")
    .from("project_memberships")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (currentRes.error) {
    throw serviceError(
      "Falha ao verificar participante do projeto",
      currentRes.error,
      "project_memberships.selectBeforeDelete",
    );
  }

  if (currentRes.data) {
    if (String(currentRes.data.role).toUpperCase() === "OWNER") {
      throw new Error(
        "O criador do projeto nao pode ser removido dos participantes.",
      );
    }

    const { error } = await db
      .schema("public")
      .from("project_memberships")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) {
      throw serviceError(
        "Falha ao remover participante do projeto",
        error,
        "project_memberships.delete",
      );
    }

    return;
  }

  const consultantRes = await db
    .schema("public")
    .from("project_consultants")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("consultant_user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (consultantRes.error) {
    throw serviceError(
      "Falha ao verificar consultor do projeto",
      consultantRes.error,
      "project_consultants.selectBeforeDelete",
    );
  }

  if (!consultantRes.data) return;

  const { error } = await db
    .schema("public")
    .from("project_consultants")
    .update({ active: false })
    .eq("project_id", projectId)
    .eq("consultant_user_id", userId);

  if (error) {
    throw serviceError(
      "Falha ao remover consultor do projeto",
      error,
      "project_consultants.update",
    );
  }
}
