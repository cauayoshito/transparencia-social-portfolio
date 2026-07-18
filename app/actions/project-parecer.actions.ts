"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole } from "@/lib/roles";
import { getProjectByIdForUser } from "@/services/projects.service";
import { logAction } from "@/services/audit.service";

const PARECER_LABEL: Record<string, string> = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  AJUSTE: "Solicitar Ajuste",
};

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function goToParecerTab(projectId: string, params: Record<string, string>) {
  const search = new URLSearchParams({ tab: "parecer", ...params });
  redirect(`/dashboard/projects/${projectId}?${search.toString()}`);
}

function toIsoDateLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthPeriod() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    periodStart: toIsoDateLocal(firstDay),
    periodEnd: toIsoDateLocal(lastDay),
  };
}

/**
 * BLOCO 2.1 — Consultor emite parecer no projeto (Aprovado / Reprovado /
 * Solicitar Ajuste) com observação livre. Ao enviar, gera um relatório
 * PENDENTE (DRAFT) vinculado ao projeto, visível para a Organização Social.
 */
export async function submitProjectParecerAction(formData: FormData) {
  const user = await requireUser();

  const projectId = asString(formData.get("project_id"));
  const decisionRaw = asString(formData.get("decision")).toUpperCase();
  const observacao = asString(formData.get("observacao"));

  if (!projectId) {
    redirect(
      `/dashboard/projects?error=${encodeURIComponent(
        "Não foi possível identificar o projeto."
      )}`
    );
  }

  const decisionLabel = PARECER_LABEL[decisionRaw];
  if (!decisionLabel) {
    goToParecerTab(projectId, {
      error: "Selecione um parecer válido (Aprovado, Reprovado ou Ajuste).",
    });
  }

  // Apenas consultor pode emitir parecer
  let role: ReturnType<typeof getPrimaryRole> = "ORG";
  try {
    const ctx = await getUserContext(user.id);
    role = getPrimaryRole(ctx);
  } catch {
    // mantém ORG
  }

  if (role !== "CONSULTANT") {
    goToParecerTab(projectId, {
      error: "Apenas consultores podem emitir parecer neste projeto.",
    });
  }

  const project = await getProjectByIdForUser(projectId, user.id);
  if (!project) {
    goToParecerTab(projectId, {
      error: "Projeto não encontrado ou sem acesso.",
    });
  }

  const { periodStart, periodEnd } = getCurrentMonthPeriod();
  const supabase = createClient() as any;

  const { data: report, error: reportError } = await supabase
    .schema("public")
    .from("reports")
    .insert({
      project_id: (project as any).id,
      title: `Parecer do consultor: ${decisionLabel}`,
      period_type: "MONTHLY",
      period_start: periodStart,
      period_end: periodEnd,
      status: "DRAFT",
      current_version: 1,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (reportError || !report) {
    goToParecerTab(projectId, {
      error: "Não foi possível gerar o relatório pendente do parecer.",
    });
  }

  const { error: versionError } = await supabase
    .schema("public")
    .from("report_versions")
    .insert({
      report_id: report.id,
      version_number: 1,
      status: "DRAFT",
      data: {
        parecer_decisao: decisionRaw,
        parecer_decisao_label: decisionLabel,
        parecer_observacao: observacao,
        parecer_consultor_id: user.id,
      },
      created_by: user.id,
    });

  if (versionError) {
    goToParecerTab(projectId, {
      error: "Parecer registrado, mas houve falha ao criar a versão inicial.",
    });
  }

  try {
    await logAction(
      "submit_project_parecer",
      "report",
      report.id,
      {
        project_id: (project as any).id,
        decision: decisionRaw,
      },
      user.id
    );
  } catch {
    // auditoria não deve bloquear o fluxo
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/dashboard/reports`);

  goToParecerTab(projectId, {
    success: `Parecer "${decisionLabel}" enviado. Relatório pendente gerado para a organização.`,
  });
}
