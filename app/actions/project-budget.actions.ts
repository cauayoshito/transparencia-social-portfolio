"use server";

/**
 * Server actions para o orçamento e cronograma de repasses do PROJETO.
 * Fluxo: cliente cadastra previsto antes de qualquer relatório existir.
 * Esses dados alimentam o resumo financeiro do relatório (VIEW calculada).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/services/auth.service";
import { getProjectByIdForUser } from "@/services/projects.service";
import {
  upsertProjectBudgetItem,
  deleteProjectBudgetItem,
  upsertProjectPlannedTransfer,
  deleteProjectPlannedTransfer,
} from "@/services/project-budget.service";

function isRedirectError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("NEXT_REDIRECT") ||
      err.constructor?.name === "RedirectError")
  );
}

function parseNum(v: unknown): number {
  const s = String(v ?? "0")
    .replace(/\s/g, "")
    .replace(/[R$\u00A0]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function safeText(v: unknown): string {
  return String(v ?? "").trim();
}

function projectFinancialUrl(projectId: string, query = "") {
  return `/dashboard/projects/${projectId}?tab=financial${query ? `&${query.replace(/^\?/, "")}` : ""}`;
}

/**
 * Garante que o usuário pode editar dados financeiros do projeto.
 * Mesma regra usada na page do projeto: ORG + status DRAFT/DEVOLVIDO.
 */
async function requireProjectEditableByUser(projectId: string, userId: string) {
  const project = await getProjectByIdForUser(projectId, userId);
  if (!project) {
    throw new Error("Acesso negado ao projeto.");
  }

  const status = String((project as any).status ?? "")
    .trim()
    .toUpperCase();

  if (status !== "DRAFT" && status !== "DEVOLVIDO") {
    throw new Error(
      "Edição do orçamento bloqueada: projeto não está em rascunho ou devolvido.",
    );
  }

  return project;
}

/**
 * Cronograma de repasses só pode ser editado após a APROVAÇÃO do projeto.
 */
async function requireProjectApprovedByUser(projectId: string, userId: string) {
  const project = await getProjectByIdForUser(projectId, userId);
  if (!project) {
    throw new Error("Acesso negado ao projeto.");
  }

  const status = String((project as any).status ?? "")
    .trim()
    .toUpperCase();

  if (status !== "APROVADO") {
    throw new Error(
      "Cronograma de repasses disponível somente após a aprovação do projeto.",
    );
  }

  return project;
}

// ---------------------------------------------------------------------------
// Budget items
// ---------------------------------------------------------------------------

export async function saveProjectBudgetItemAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));
  const go = (q: string) => redirect(projectFinancialUrl(projectId, q));

  try {
    const user = await requireUser();
    await requireProjectEditableByUser(projectId, (user as any).id);

    const investmentType = safeText(formData.get("investment_type"));
    const itemDescription = safeText(formData.get("item_description"));

    if (!investmentType || !itemDescription) {
      return go(
        "?err=" +
          encodeURIComponent("Tipo de investimento e item são obrigatórios."),
      );
    }

    const quantity = parseNum(formData.get("quantity"));

    // Detalhes opcionais por bloco (spec Recursos Públicos):
    // RH (formação/função/horas/vínculo) e justificativa de materiais.
    const details: Record<string, string> = {};
    for (const key of [
      "rh_formacao",
      "rh_funcao",
      "rh_horas",
      "rh_vinculo",
      "justificativa",
    ]) {
      const v = safeText(formData.get(key));
      if (v) details[key] = v;
    }

    await upsertProjectBudgetItem(projectId, {
      id: safeText(formData.get("item_id")) || undefined,
      investment_type: investmentType,
      item_description: itemDescription,
      quantity: quantity > 0 ? quantity : 1,
      unit_amount: parseNum(formData.get("unit_amount")),
      details: Object.keys(details).length > 0 ? details : null,
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      "?err=" +
        encodeURIComponent(
          err instanceof Error ? err.message : "Erro ao salvar item.",
        ),
    );
  }
}

export async function deleteProjectBudgetItemAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));
  const itemId = safeText(formData.get("item_id"));
  const go = (q: string) => redirect(projectFinancialUrl(projectId, q));

  try {
    const user = await requireUser();
    await requireProjectEditableByUser(projectId, (user as any).id);

    if (!itemId) {
      return go("?err=" + encodeURIComponent("Item inválido."));
    }

    await deleteProjectBudgetItem(projectId, itemId);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      "?err=" +
        encodeURIComponent(
          err instanceof Error ? err.message : "Erro ao remover item.",
        ),
    );
  }
}

// ---------------------------------------------------------------------------
// Planned transfers
// ---------------------------------------------------------------------------

export async function saveProjectPlannedTransferAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));
  const go = (q: string) => redirect(projectFinancialUrl(projectId, q));

  try {
    const user = await requireUser();
    await requireProjectApprovedByUser(projectId, (user as any).id);

    const referenceDate = safeText(formData.get("reference_date"));
    if (!referenceDate) {
      return go(
        "?err=" +
          encodeURIComponent("Informe a data de referência do repasse."),
      );
    }

    const realizedAtRaw = safeText(formData.get("realized_at"));
    const realizedAmountRaw = safeText(formData.get("realized_amount"));

    await upsertProjectPlannedTransfer(projectId, {
      id: safeText(formData.get("transfer_id")) || undefined,
      reference_date: referenceDate,
      planned_amount: parseNum(formData.get("planned_amount")),
      realized_amount: realizedAmountRaw ? parseNum(realizedAmountRaw) : null,
      realized_at: realizedAtRaw || null,
      description: safeText(formData.get("description")) || null,
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      "?err=" +
        encodeURIComponent(
          err instanceof Error ? err.message : "Erro ao salvar repasse.",
        ),
    );
  }
}

export async function deleteProjectPlannedTransferAction(formData: FormData) {
  const projectId = safeText(formData.get("project_id"));
  const transferId = safeText(formData.get("transfer_id"));
  const go = (q: string) => redirect(projectFinancialUrl(projectId, q));

  try {
    const user = await requireUser();
    await requireProjectApprovedByUser(projectId, (user as any).id);

    if (!transferId) {
      return go("?err=" + encodeURIComponent("Repasse inválido."));
    }

    await deleteProjectPlannedTransfer(projectId, transferId);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(
      "?err=" +
        encodeURIComponent(
          err instanceof Error ? err.message : "Erro ao remover repasse.",
        ),
    );
  }
}
