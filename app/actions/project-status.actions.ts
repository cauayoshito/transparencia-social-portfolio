"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { readAndValidateProjectId, readRequiredString } from "@/lib/validation/ids";
import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole } from "@/lib/roles";

function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUS as readonly string[]).includes(value);
}

function redirectWithMessage(
  projectId: string,
  params: { success?: string; error?: string }
): never {
  const search = new URLSearchParams();

  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);

  redirect(`/dashboard/projects/${projectId}?${search.toString()}`);
}

function getReason(nextStatus: ProjectStatus, formData: FormData): string | null {
  if (nextStatus === "DEVOLVIDO") {
    return readRequiredString(formData, "reason");
  }

  if (nextStatus === "ENVIADO") return "envio pela tela do projeto";
  if (nextStatus === "EM_ANALISE") return "análise iniciada pela tela do projeto";
  if (nextStatus === "APROVADO") return "aprovação pela tela do projeto";
  return "atualização pela tela do projeto";
}

function successMessage(nextStatus: ProjectStatus): string {
  if (nextStatus === "ENVIADO") return "Projeto enviado para análise.";
  if (nextStatus === "EM_ANALISE") return "Análise iniciada com sucesso.";
  if (nextStatus === "APROVADO") return "Projeto aprovado com sucesso.";
  if (nextStatus === "DEVOLVIDO") return "Projeto devolvido para ajustes.";
  return "Status do projeto atualizado com sucesso.";
}

export async function changeProjectStatusAction(formData: FormData) {
  const projectId = readAndValidateProjectId(formData);
  const nextStatusRaw = readRequiredString(formData, "next_status").toUpperCase();

  if (!isProjectStatus(nextStatusRaw)) {
    redirectWithMessage(projectId, {
      error: "O status solicitado é inválido.",
    });
  }

  // P0: Validação de permissão por perfil
  const user = await requireUser();
  const ctx = await getUserContext(user.id);
  const role = getPrimaryRole(ctx);

  // ORG: pode ENVIAR (DRAFT→ENVIADO) e REENVIAR (DEVOLVIDO→ENVIADO)
  // INVESTOR: pode INICIAR_ANALISE (ENVIADO→EM_ANALISE), APROVAR, DEVOLVER
  // CONSULTANT: pode INICIAR_ANALISE (ENVIADO→EM_ANALISE)
  const orgAllowed: ProjectStatus[] = ["ENVIADO"];
  const investorAllowed: ProjectStatus[] = ["EM_ANALISE", "APROVADO", "DEVOLVIDO"];
  const consultantAllowed: ProjectStatus[] = ["EM_ANALISE"];

  const allowedStatuses =
    role === "INVESTOR"
      ? investorAllowed
      : role === "CONSULTANT"
        ? consultantAllowed
        : orgAllowed;

  if (!allowedStatuses.includes(nextStatusRaw as ProjectStatus)) {
    redirectWithMessage(projectId, {
      error: `Seu perfil (${role}) não tem permissão para esta transição de status.`,
    });
  }

  const reason = getReason(nextStatusRaw, formData);
  const supabase = createClient() as any;

  const { error } = await supabase.rpc("phi_set_project_status", {
    p_project_id: projectId,
    p_new_status: nextStatusRaw,
    p_reason: reason,
  });

  if (error) {
    redirectWithMessage(projectId, {
      error: "Não foi possível atualizar o status do projeto.",
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/projects");
  redirectWithMessage(projectId, {
    success: successMessage(nextStatusRaw),
  });
}

