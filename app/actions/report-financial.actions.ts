"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import {
  upsertFinancialItem,
  deleteFinancialItem,
  upsertFinancialSummary,
  upsertReallocation,
  deleteReallocation,
  upsertReceipt,
  deleteReceipt,
  createBankStatement,
  deleteBankStatement,
  listReceipts,
  listBankStatements,
} from "@/services/report-financial.service";
import { createClient } from "@/lib/supabase/server";

function isRedirectError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("NEXT_REDIRECT") || err.constructor?.name === "RedirectError")
  );
}

function parseNum(v: unknown): number {
  const s = String(v ?? "0")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function editUrl(reportId: string, query = "") {
  return `/dashboard/reports/${reportId}/edit${query}`;
}

// ============================================================================
// FIX: Verificação centralizada de acesso e status DRAFT
// Todas as ações financeiras DEVEM verificar:
//   1. Usuário autenticado (requireUser)
//   2. Usuário tem acesso ao projeto do relatório
//   3. Relatório está em status DRAFT
// ============================================================================

async function requireReportDraftAccess(reportId: string, userId: string) {
  const supabase = createClient();
  const db = supabase as any;

  // Buscar relatório
  const { data: report, error: repErr } = await db
    .from("reports")
    .select("id, project_id, status")
    .eq("id", reportId)
    .single();

  if (repErr || !report) {
    throw new Error("Relatório não encontrado.");
  }

  // Verificar status DRAFT ou RETURNED (ORG pode editar relatórios devolvidos)
  const reportStatus = String(report.status).toUpperCase();
  if (reportStatus !== "DRAFT" && reportStatus !== "RETURNED") {
    throw new Error("Edição financeira bloqueada: relatório não está em DRAFT ou RETURNED.");
  }

  // Verificar acesso ao projeto (via projects.service)
  const { getProjectByIdForUser } = await import("@/services/projects.service");
  const project = await getProjectByIdForUser(report.project_id, userId);
  if (!project) {
    throw new Error("Acesso negado ao projeto deste relatório.");
  }

  return { report, project };
}

// ============================================================================
// Seção 12: Itens financeiros
// ============================================================================

export async function saveFinancialItemAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    const itemId = String(formData.get("item_id") ?? "").trim() || undefined;

    await upsertFinancialItem(reportId, {
      id: itemId,
      investment_type: String(formData.get("investment_type") ?? "").trim(),
      item_description: String(formData.get("item_description") ?? "").trim(),
      budget_planned: parseNum(formData.get("budget_planned")),
      total_spent: parseNum(formData.get("total_spent")),
      total_reallocated: parseNum(formData.get("total_reallocated")),
      previous_balance: parseNum(formData.get("previous_balance")),
      period_expenses: parseNum(formData.get("period_expenses")),
      period_realloc: parseNum(formData.get("period_realloc")),
      current_balance: parseNum(formData.get("current_balance")),
    });

    revalidatePath(editUrl(reportId));
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao salvar item financeiro.")}`);
  }
}

/**
 * Lança o gasto no período de um item do ORÇAMENTO DO PROJETO no relatório.
 * O relatório puxa os itens do orçamento; a organização preenche apenas o
 * gasto. Grava (upsert) em report_financial_items vinculado ao item do
 * orçamento — assim o resumo financeiro (VIEW) recalcula automaticamente.
 */
export async function saveBudgetExecutionAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    const budgetItemId = String(formData.get("budget_item_id") ?? "").trim();
    if (!budgetItemId) {
      return go(`?err=${encodeURIComponent("Item de orçamento inválido.")}`);
    }

    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("report_financial_items")
      .upsert(
        {
          report_id: reportId,
          budget_item_id: budgetItemId,
          investment_type: String(formData.get("investment_type") ?? "").trim(),
          item_description: String(formData.get("item_description") ?? "").trim(),
          budget_planned: parseNum(formData.get("budget_planned")),
          period_expenses: parseNum(formData.get("period_expenses")),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "report_id,budget_item_id" },
      );

    if (error) {
      throw new Error(`Falha ao lançar gasto: ${error.message}`);
    }

    revalidatePath(editUrl(reportId));
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao lançar gasto.")}`);
  }
}

export async function deleteFinancialItemAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    // FIX: Verificar que o item pertence ao relatório informado
    const supabase = createClient();
    const { data: item } = await (supabase as any)
      .from("report_financial_items")
      .select("id, report_id")
      .eq("id", itemId)
      .single();

    if (!item || item.report_id !== reportId) {
      return go(`?err=${encodeURIComponent("Item não pertence a este relatório.")}`);
    }

    await deleteFinancialItem(itemId);
    revalidatePath(editUrl(reportId));
    return go("?removed=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao excluir.")}`);
  }
}

// ============================================================================
// Resumo financeiro
// ============================================================================

/**
 * @deprecated O resumo financeiro agora é uma VIEW calculada automaticamente
 * a partir do orçamento previsto do projeto, dos repasses realizados e das
 * despesas lançadas no relatório. Este action é mantido apenas como stub
 * para não quebrar formulários legados que ainda apontem pra ele.
 */
export async function saveFinancialSummaryAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  return redirect(
    editUrl(
      reportId,
      "?err=" +
        encodeURIComponent(
          "O resumo financeiro é calculado automaticamente. Edite o orçamento do projeto ou as despesas do relatório.",
        ),
    ),
  );
}

// ============================================================================
// Seção 13: Remanejamentos
// ============================================================================

export async function saveReallocationAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    const itemId = String(formData.get("item_id") ?? "").trim() || undefined;

    await upsertReallocation(reportId, {
      id: itemId,
      original_type: String(formData.get("original_type") ?? "").trim(),
      original_item: String(formData.get("original_item") ?? "").trim(),
      original_value: parseNum(formData.get("original_value")),
      new_type: String(formData.get("new_type") ?? "").trim() || null,
      new_item: String(formData.get("new_item") ?? "").trim() || null,
      reallocated_value: parseNum(formData.get("reallocated_value")),
    });

    revalidatePath(editUrl(reportId));
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao salvar remanejamento.")}`);
  }
}

export async function deleteReallocationAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    // FIX: Verificar que o item pertence ao relatório
    const supabase = createClient();
    const { data: item } = await (supabase as any)
      .from("report_reallocations")
      .select("id, report_id")
      .eq("id", itemId)
      .single();

    if (!item || item.report_id !== reportId) {
      return go(`?err=${encodeURIComponent("Item não pertence a este relatório.")}`);
    }

    await deleteReallocation(itemId);
    revalidatePath(editUrl(reportId));
    return go("?removed=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao excluir.")}`);
  }
}

// ============================================================================
// Seção 14: Recibos / Notas fiscais
// ============================================================================

// ============================================================================
// Repasse do recurso lançado no relatório (valor, data, tipo)
// ============================================================================

export async function saveReportTransferAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    const amount = parseNum(formData.get("amount"));
    if (!amount) {
      return go(`?err=${encodeURIComponent("Informe o valor do repasse.")}`);
    }

    const supabase = createClient();
    const { error } = await (supabase as any).from("report_transfers").insert({
      report_id: reportId,
      amount,
      transfer_date: String(formData.get("transfer_date") ?? "").trim() || null,
      transfer_type: String(formData.get("transfer_type") ?? "").trim() || null,
    });

    if (error) throw new Error(`Falha ao lançar repasse: ${error.message}`);

    revalidatePath(editUrl(reportId));
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao lançar repasse.")}`);
  }
}

export async function deleteReportTransferAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const transferId = String(formData.get("transfer_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("report_transfers")
      .delete()
      .eq("id", transferId)
      .eq("report_id", reportId);

    if (error) throw new Error(`Falha ao remover repasse: ${error.message}`);

    revalidatePath(editUrl(reportId));
    return go("?saved=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao remover repasse.")}`);
  }
}

export async function saveReceiptAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    const itemId = String(formData.get("item_id") ?? "").trim() || undefined;

    // Handle file upload if present
    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    const file = formData.get("receipt_file") as File | null;
    if (file && typeof (file as any).arrayBuffer === "function" && file.size > 0) {
      const maxBytes = 15 * 1024 * 1024;
      if (file.size > maxBytes) {
        return go(`?err=${encodeURIComponent("Arquivo muito grande. Máximo: 15MB.")}`);
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeName = (file.name || "nota").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${reportId}/receipts/${stamp}-${safeName}`;

      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from("reports")
        .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });

      if (uploadErr) {
        return go(`?err=${encodeURIComponent(`Falha no upload: ${uploadErr.message}`)}`);
      }

      filePath = path;
      fileName = safeName;
      fileSize = file.size;
      mimeType = file.type || "application/octet-stream";
    }

    await upsertReceipt(reportId, {
      id: itemId,
      budget_item_id: String(formData.get("budget_item_id") ?? "").trim() || null,
      planning_item: String(formData.get("planning_item") ?? "").trim(),
      receipt_description: String(formData.get("receipt_description") ?? "").trim(),
      receipt_value: parseNum(formData.get("receipt_value")),
      receipt_number: String(formData.get("receipt_number") ?? "").trim() || null,
      receipt_date: String(formData.get("receipt_date") ?? "").trim() || null,
      is_reallocated: formData.get("is_reallocated") === "true",
      ...(filePath ? { file_path: filePath, file_name: fileName, file_size: fileSize, mime_type: mimeType } : {}),
    });

    revalidatePath(editUrl(reportId));
    return go("?receipt=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao salvar recibo.")}`);
  }
}

export async function deleteReceiptAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    // FIX: Verificar ownership e limpar arquivo do Storage
    const supabase = createClient();
    const { data: item } = await (supabase as any)
      .from("report_receipts")
      .select("id, report_id, file_path")
      .eq("id", itemId)
      .single();

    if (!item || item.report_id !== reportId) {
      return go(`?err=${encodeURIComponent("Recibo não pertence a este relatório.")}`);
    }

    // Limpar arquivo do Storage se existir
    if (item.file_path) {
      await supabase.storage.from("reports").remove([item.file_path]);
    }

    await deleteReceipt(itemId);
    revalidatePath(editUrl(reportId));
    return go("?removed=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao excluir.")}`);
  }
}

// ============================================================================
// Seção 15: Extratos bancários
// ============================================================================

export async function saveBankStatementAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    const file = formData.get("statement_file") as File | null;
    if (!file || typeof (file as any).arrayBuffer !== "function" || file.size === 0) {
      return go(`?err=${encodeURIComponent("Selecione um arquivo de extrato.")}`);
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return go(`?err=${encodeURIComponent("Arquivo muito grande. Máximo: 20MB.")}`);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = (file.name || "extrato").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${reportId}/bank_statements/${stamp}-${safeName}`;

    const supabase = createClient();
    const { error: uploadErr } = await supabase.storage
      .from("reports")
      .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });

    if (uploadErr) {
      return go(`?err=${encodeURIComponent(`Falha no upload: ${uploadErr.message}`)}`);
    }

    const label = String(formData.get("label") ?? "").trim() || safeName;

    await createBankStatement(reportId, {
      label,
      file_path: path,
      file_name: safeName,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
    });

    revalidatePath(editUrl(reportId));
    return go("?bank=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao salvar extrato.")}`);
  }
}

export async function deleteBankStatementAction(formData: FormData) {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const go = (q: string) => redirect(editUrl(reportId, q));

  try {
    const user = await requireUser();
    await requireReportDraftAccess(reportId, user.id);

    // FIX: Verificar ownership e limpar arquivo do Storage
    const supabase = createClient();
    const { data: item } = await (supabase as any)
      .from("report_bank_statements")
      .select("id, report_id, file_path")
      .eq("id", itemId)
      .single();

    if (!item || item.report_id !== reportId) {
      return go(`?err=${encodeURIComponent("Extrato não pertence a este relatório.")}`);
    }

    // Limpar arquivo do Storage se existir
    if (item.file_path) {
      await supabase.storage.from("reports").remove([item.file_path]);
    }

    await deleteBankStatement(itemId);
    revalidatePath(editUrl(reportId));
    return go("?removed=1");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return go(`?err=${encodeURIComponent(err instanceof Error ? err.message : "Erro ao excluir.")}`);
  }
}
