"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import { createClient } from "@/lib/supabase/server";
import {
  upsertReportActivity,
  deleteReportActivity,
} from "@/services/report-activities.service";

function isRedirectError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("NEXT_REDIRECT") ||
      err.constructor?.name === "RedirectError")
  );
}

function safeText(v: unknown): string {
  return String(v ?? "").trim();
}

function editUrl(reportId: string, query = "") {
  return `/dashboard/reports/${reportId}/edit${query}`;
}

/**
 * Mesma regra das seções financeiras: relatório precisa estar em DRAFT/RETURNED
 * e o usuário precisa ter acesso ao projeto do relatório.
 */
async function requireReportDraftAccess(reportId: string, userId: string) {
  const supabase = createClient();
  const db = supabase as any;

  const { data: report, error: repErr } = await db
    .from("reports")
    .select("id, project_id, status")
    .eq("id", reportId)
    .single();

  if (repErr || !report) {
    throw new Error("Relatório não encontrado.");
  }

  const reportStatus = String(report.status).toUpperCase();
  if (reportStatus !== "DRAFT" && reportStatus !== "RETURNED") {
    throw new Error(
      "Edição bloqueada: relatório não está em DRAFT ou RETURNED.",
    );
  }

  const { getProjectByIdForUser } = await import("@/services/projects.service");
  const project = await getProjectByIdForUser(report.project_id, userId);
  if (!project) {
    throw new Error("Acesso negado ao projeto deste relatório.");
  }

  return { report, project };
}

export async function saveReportActivityAction(formData: FormData) {
  const reportId = safeText(formData.get("report_id"));
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, (user as any).id);

    const activity = safeText(formData.get("activity"));
    if (!activity) {
      return go(`?err=${encodeURIComponent("Informe a atividade.")}`);
    }

    const yearRaw = safeText(formData.get("activity_year"));
    const year = parseInt(yearRaw, 10);

    // Avaliação limitada a 500 caracteres (modelo PHI).
    const evaluation = safeText(formData.get("evaluation")).slice(0, 500);

    await upsertReportActivity(reportId, {
      id: safeText(formData.get("activity_id")) || undefined,
      activity_month: safeText(formData.get("activity_month")) || null,
      activity_year: Number.isFinite(year) ? year : null,
      activity,
      execution: safeText(formData.get("execution")) || null,
      evaluation: evaluation || null,
    });

    revalidatePath(editUrl(reportId));
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      `?err=${encodeURIComponent(
        err instanceof Error ? err.message : "Erro ao salvar atividade.",
      )}`,
    );
  }
}

/**
 * Puxa o cronograma cadastrado no projeto para a tabela de atividades do
 * relatório (conforme spec: "Puxar o cronograma conforme o período da
 * prestação de contas"). Não duplica linhas já importadas.
 */
export async function importScheduleToReportAction(formData: FormData) {
  const reportId = safeText(formData.get("report_id"));
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    const { report } = await requireReportDraftAccess(reportId, (user as any).id);

    const { listProjectScheduleItems } = await import(
      "@/services/project-schedule.service"
    );
    const { listReportActivities, upsertReportActivity } = await import(
      "@/services/report-activities.service"
    );

    const [schedule, existing] = await Promise.all([
      listProjectScheduleItems(String((report as any).project_id)),
      listReportActivities(reportId),
    ]);

    if (schedule.length === 0) {
      return go(
        `?err=${encodeURIComponent(
          "O projeto não tem cronograma cadastrado. Cadastre na aba Plano do projeto.",
        )}`,
      );
    }

    const existingKeys = new Set(
      existing.map(
        (a) => `${a.activity_month ?? ""}|${a.activity_year ?? ""}|${a.activity}`,
      ),
    );

    let imported = 0;
    for (const item of schedule) {
      const key = `${item.activity_month ?? ""}|${item.activity_year ?? ""}|${item.activity}`;
      if (existingKeys.has(key)) continue;
      await upsertReportActivity(reportId, {
        activity_month: item.activity_month,
        activity_year: item.activity_year,
        activity: item.activity,
      });
      imported += 1;
    }

    revalidatePath(editUrl(reportId));
    return go(
      imported > 0
        ? "?saved=1"
        : `?err=${encodeURIComponent("Todas as atividades do cronograma já foram importadas.")}`,
    );
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      `?err=${encodeURIComponent(
        err instanceof Error ? err.message : "Erro ao importar cronograma.",
      )}`,
    );
  }
}

/**
 * Avaliação de contrapartida no relatório (execução + comentário).
 */
export async function saveCounterpartReviewAction(formData: FormData) {
  const reportId = safeText(formData.get("report_id"));
  const counterpartId = safeText(formData.get("counterpart_id"));
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, (user as any).id);

    if (!counterpartId) {
      return go(`?err=${encodeURIComponent("Contrapartida inválida.")}`);
    }

    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("report_counterpart_reviews")
      .upsert(
        {
          report_id: reportId,
          counterpart_id: counterpartId,
          execution: safeText(formData.get("execution")) || null,
          comment: safeText(formData.get("comment")) || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "report_id,counterpart_id" },
      );

    if (error) {
      throw new Error(`Falha ao salvar avaliação: ${error.message}`);
    }

    revalidatePath(editUrl(reportId));
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      `?err=${encodeURIComponent(
        err instanceof Error ? err.message : "Erro ao salvar avaliação.",
      )}`,
    );
  }
}

export async function deleteReportActivityAction(formData: FormData) {
  const reportId = safeText(formData.get("report_id"));
  const activityId = safeText(formData.get("activity_id"));
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, (user as any).id);

    if (!activityId) {
      return go(`?err=${encodeURIComponent("Atividade inválida.")}`);
    }

    await deleteReportActivity(reportId, activityId);
    revalidatePath(editUrl(reportId));
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      `?err=${encodeURIComponent(
        err instanceof Error ? err.message : "Erro ao remover atividade.",
      )}`,
    );
  }
}
