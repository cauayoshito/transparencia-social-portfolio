"use server";

/**
 * Server actions do cronograma mês a mês e das contrapartidas pactuadas.
 * Mesma regra de edição do restante do projeto: ORG + DRAFT/DEVOLVIDO.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/services/auth.service";
import { getProjectByIdForUser } from "@/services/projects.service";
import {
  createProjectScheduleItem,
  deleteProjectScheduleItem,
  createProjectCounterpart,
  deleteProjectCounterpart,
} from "@/services/project-schedule.service";

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

function planUrl(projectId: string, query = "") {
  return `/dashboard/projects/${projectId}?tab=plan${query}`;
}

async function requireProjectEditableByUser(projectId: string, userId: string) {
  const project = await getProjectByIdForUser(projectId, userId);
  if (!project) throw new Error("Acesso negado ao projeto.");

  const status = String((project as any).status ?? "").trim().toUpperCase();
  if (status !== "DRAFT" && status !== "DEVOLVIDO") {
    throw new Error(
      "Edição bloqueada: projeto não está em rascunho ou devolvido.",
    );
  }
  return project;
}

// ── Cronograma ──

export async function saveScheduleItemAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));
  const go = (q: string) => redirect(planUrl(projectId, q));

  try {
    const user = await requireUser();
    await requireProjectEditableByUser(projectId, (user as any).id);

    const activity = safeText(formData.get("activity"));
    if (!activity) {
      return go(`&error=${encodeURIComponent("Informe a atividade.")}`);
    }

    const year = parseInt(safeText(formData.get("activity_year")), 10);

    await createProjectScheduleItem(projectId, {
      activity_month: safeText(formData.get("activity_month")) || null,
      activity_year: Number.isFinite(year) ? year : null,
      activity,
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return go(`&success=${encodeURIComponent("Atividade adicionada ao cronograma.")}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      `&error=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao salvar atividade.")}`,
    );
  }
}

export async function deleteScheduleItemAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));
  const itemId = safeText(formData.get("item_id"));
  const go = (q: string) => redirect(planUrl(projectId, q));

  try {
    const user = await requireUser();
    await requireProjectEditableByUser(projectId, (user as any).id);

    if (!itemId) return go(`&error=${encodeURIComponent("Item inválido.")}`);

    await deleteProjectScheduleItem(projectId, itemId);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return go(`&success=${encodeURIComponent("Atividade removida.")}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      `&error=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao remover atividade.")}`,
    );
  }
}

// ── Contrapartidas ──

export async function saveCounterpartAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));
  const go = (q: string) => redirect(planUrl(projectId, q));

  try {
    const user = await requireUser();
    await requireProjectEditableByUser(projectId, (user as any).id);

    const title = safeText(formData.get("title"));
    if (!title) {
      return go(`&error=${encodeURIComponent("Informe a contrapartida.")}`);
    }

    await createProjectCounterpart(projectId, {
      title,
      description: safeText(formData.get("description")) || null,
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return go(`&success=${encodeURIComponent("Contrapartida adicionada.")}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      `&error=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao salvar contrapartida.")}`,
    );
  }
}

export async function deleteCounterpartAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));
  const counterpartId = safeText(formData.get("counterpart_id"));
  const go = (q: string) => redirect(planUrl(projectId, q));

  try {
    const user = await requireUser();
    await requireProjectEditableByUser(projectId, (user as any).id);

    if (!counterpartId) {
      return go(`&error=${encodeURIComponent("Contrapartida inválida.")}`);
    }

    await deleteProjectCounterpart(projectId, counterpartId);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return go(`&success=${encodeURIComponent("Contrapartida removida.")}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      `&error=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao remover contrapartida.")}`,
    );
  }
}
