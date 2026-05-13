"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";

import { requireUser } from "@/services/auth.service";
import {
  getOrganizationMemberships,
  getUserContext,
  getInvestorMemberships,
} from "@/services/membership.service";
import {
  addProjectParticipant,
  getProjectByIdForUser,
  removeProjectParticipant,
} from "@/services/projects.service";

function redirectWithMessage(
  projectId: string,
  params: { success?: string; error?: string }
): never {
  const search = new URLSearchParams();
  search.set("tab", "overview");

  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);

  redirect(`/dashboard/projects/${projectId}?${search.toString()}`);
}

function normalizeRole(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export async function addProjectParticipantAction(formData: FormData) {
  const user = (await requireUser()) as any;
  const safeUserId = user?.id ?? user?.user?.id;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const participantUserId = String(formData.get("user_id") ?? "").trim();
  const role = normalizeRole(formData.get("role"));

  if (!safeUserId || !projectId) {
    redirect("/dashboard/projects");
  }

  if (!participantUserId || !role) {
    redirectWithMessage(projectId, {
      error: "Selecione o membro e o papel do participante.",
    });
  }

  if (!["CONSULTANT", "INVESTOR", "VIEWER"].includes(role)) {
    redirectWithMessage(projectId, {
      error: "O papel selecionado para o participante é inválido.",
    });
  }

  try {
    const project = await getProjectByIdForUser(projectId, safeUserId);

    if (!project) {
      redirectWithMessage(projectId, {
        error: "Você não tem acesso a este projeto.",
      });
    }

    const memberships = await getOrganizationMemberships(safeUserId);
    const orgMembership = memberships.find(
      (membership) => membership.organization_id === project.organization_id
    );

    if (!orgMembership) {
      redirectWithMessage(projectId, {
        error:
          "Você não tem permissão para gerenciar participantes deste projeto.",
      });
    }

    await addProjectParticipant(
      projectId,
      participantUserId,
      role as "CONSULTANT" | "INVESTOR" | "VIEWER",
      safeUserId
    );

    redirectWithMessage(projectId, {
      success: "Participante adicionado ao projeto com sucesso.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(projectId, {
      error: "Não foi possível adicionar o participante.",
    });
  }
}

export async function removeProjectParticipantAction(formData: FormData) {
  const user = (await requireUser()) as any;
  const safeUserId = user?.id ?? user?.user?.id;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const participantUserId = String(formData.get("user_id") ?? "").trim();

  if (!safeUserId || !projectId) {
    redirect("/dashboard/projects");
  }

  if (!participantUserId) {
    redirectWithMessage(projectId, {
      error: "Participante inválido para remoção.",
    });
  }

  try {
    const project = await getProjectByIdForUser(projectId, safeUserId);

    if (!project) {
      redirectWithMessage(projectId, {
        error: "Você não tem acesso a este projeto.",
      });
    }

    const memberships = await getOrganizationMemberships(safeUserId);
    const orgMembership = memberships.find(
      (membership) => membership.organization_id === project.organization_id
    );

    if (!orgMembership) {
      redirectWithMessage(projectId, {
        error:
          "Você não tem permissão para gerenciar participantes deste projeto.",
      });
    }

    await removeProjectParticipant(projectId, participantUserId);

    redirectWithMessage(projectId, {
      success: "Participante removido do projeto com sucesso.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(projectId, {
      error: "Não foi possível remover o participante.",
    });
  }
}

/**
 * P0: Investidor atribui consultor ao projeto.
 * Somente INVESTOR pode chamar esta action.
 * O consultor deve estar em consultant_links do investidor.
 */
export async function assignConsultantToProjectAction(formData: FormData) {
  const user = (await requireUser()) as any;
  const safeUserId = user?.id ?? user?.user?.id;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const consultantUserId = String(formData.get("consultant_user_id") ?? "").trim();

  if (!safeUserId || !projectId) {
    redirect("/dashboard/projects");
  }

  if (!consultantUserId) {
    redirectWithMessage(projectId, {
      error: "Selecione um consultor para atribuir ao projeto.",
    });
  }

  try {
    // Verificar que o caller é INVESTOR
    const ctx = await getUserContext(safeUserId);
    if (!ctx.roles.includes("INVESTOR")) {
      redirectWithMessage(projectId, {
        error: "Apenas financiadores podem atribuir consultores a projetos.",
      });
    }

    // Verificar acesso ao projeto
    const project = await getProjectByIdForUser(projectId, safeUserId);
    if (!project) {
      redirectWithMessage(projectId, {
        error: "Você não tem acesso a este projeto.",
      });
    }

    // Verificar que o consultor está vinculado ao investidor
    const investorMemberships = await getInvestorMemberships(safeUserId);
    if (investorMemberships.length === 0) {
      redirectWithMessage(projectId, {
        error: "Você não está vinculado a nenhum investidor.",
      });
    }

    // Validar que o consultor realmente pertence a este investidor
    const { listAvailableConsultantsForProject } = await import(
      "@/services/projects.service"
    );
    const investorId = investorMemberships[0].investor_id;
    // Buscar todos os consultores do investidor (incluindo já atribuídos)
    // para validar que o consultantUserId é legítimo
    const { createClient: createSC } = await import("@/lib/supabase/server");
    const db = createSC() as any;
    const { data: linkCheck } = await db
      .schema("public")
      .from("consultant_links")
      .select("consultant_user_id")
      .eq("investor_id", investorId)
      .eq("consultant_user_id", consultantUserId)
      .eq("is_active", true)
      .maybeSingle();

    if (!linkCheck) {
      redirectWithMessage(projectId, {
        error: "Este consultor não está vinculado ao seu investidor.",
      });
    }

    // Atribuir o consultor ao projeto
    await addProjectParticipant(
      projectId,
      consultantUserId,
      "CONSULTANT",
      safeUserId,
    );

    redirectWithMessage(projectId, {
      success: "Consultor atribuído ao projeto com sucesso.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(projectId, {
      error: "Não foi possível atribuir o consultor ao projeto.",
    });
  }
}

/**
 * P0: Investidor remove consultor do projeto.
 */
export async function removeConsultantFromProjectAction(formData: FormData) {
  const user = (await requireUser()) as any;
  const safeUserId = user?.id ?? user?.user?.id;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const consultantUserId = String(formData.get("consultant_user_id") ?? "").trim();

  if (!safeUserId || !projectId) {
    redirect("/dashboard/projects");
  }

  if (!consultantUserId) {
    redirectWithMessage(projectId, {
      error: "Consultor inválido para remoção.",
    });
  }

  try {
    const ctx = await getUserContext(safeUserId);
    if (!ctx.roles.includes("INVESTOR")) {
      redirectWithMessage(projectId, {
        error: "Apenas financiadores podem remover consultores de projetos.",
      });
    }

    const project = await getProjectByIdForUser(projectId, safeUserId);
    if (!project) {
      redirectWithMessage(projectId, {
        error: "Você não tem acesso a este projeto.",
      });
    }

    await removeProjectParticipant(projectId, consultantUserId);

    redirectWithMessage(projectId, {
      success: "Consultor removido do projeto com sucesso.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(projectId, {
      error: "Não foi possível remover o consultor do projeto.",
    });
  }
}
