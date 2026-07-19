/**
 * Project Budget Service
 *
 * Lê e escreve dados financeiros do PROJETO (orçamento previsto + cronograma
 * de repasses). Esses dados são entrados ANTES de qualquer relatório existir
 * e alimentam o resumo financeiro do relatório (que agora é uma VIEW).
 *
 * Tabelas:
 *   - project_budget_items     (linhas de orçamento previsto)
 *   - project_planned_transfers (cronograma de repasses: previsto + realizado)
 */

import { createClient } from "@/lib/supabase/server";

export type ProjectBudgetItem = {
  id: string;
  project_id: string;
  investment_type: string;
  item_description: string;
  /** Quantidade de itens. planned_amount = quantity * unit_amount. */
  quantity: number;
  /** Valor unitário (R$). planned_amount = quantity * unit_amount. */
  unit_amount: number;
  /** Valor total da linha (quantidade x valor unitário). */
  planned_amount: number;
  /** Detalhes por bloco (spec Recursos Públicos): rh_formacao, rh_funcao,
   *  rh_horas, rh_vinculo (PF/PJ), justificativa. */
  details: Record<string, string> | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

export type ProjectPlannedTransfer = {
  id: string;
  project_id: string;
  reference_date: string;
  planned_amount: number;
  realized_amount: number | null;
  realized_at: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectBudgetSnapshot = {
  items: ProjectBudgetItem[];
  transfers: ProjectPlannedTransfer[];
  totals: {
    total_planned: number;        // soma dos itens de orçamento
    total_transfers_planned: number;
    total_transfers_realized: number;
  };
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listProjectBudgetItems(
  projectId: string,
): Promise<ProjectBudgetItem[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("project_budget_items")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Falha ao listar orçamento do projeto: ${error.message}`);
  return (data ?? []) as ProjectBudgetItem[];
}

export async function listProjectPlannedTransfers(
  projectId: string,
): Promise<ProjectPlannedTransfer[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("project_planned_transfers")
    .select("*")
    .eq("project_id", projectId)
    .order("reference_date", { ascending: true });

  if (error) throw new Error(`Falha ao listar repasses do projeto: ${error.message}`);
  return (data ?? []) as ProjectPlannedTransfer[];
}

export async function getProjectBudgetSnapshot(
  projectId: string,
): Promise<ProjectBudgetSnapshot> {
  const [items, transfers] = await Promise.all([
    listProjectBudgetItems(projectId),
    listProjectPlannedTransfers(projectId),
  ]);

  const totals = {
    total_planned: items.reduce((s, i) => s + Number(i.planned_amount ?? 0), 0),
    total_transfers_planned: transfers.reduce(
      (s, t) => s + Number(t.planned_amount ?? 0),
      0,
    ),
    total_transfers_realized: transfers.reduce(
      (s, t) => s + Number(t.realized_amount ?? 0),
      0,
    ),
  };

  return { items, transfers, totals };
}

// ---------------------------------------------------------------------------
// Write – budget items
// ---------------------------------------------------------------------------

export async function upsertProjectBudgetItem(
  projectId: string,
  item: Partial<ProjectBudgetItem> & {
    investment_type: string;
    item_description: string;
  },
): Promise<ProjectBudgetItem> {
  const supabase = createClient();
  const db = supabase as any;

  const quantity = item.quantity ?? 1;
  const unitAmount = item.unit_amount ?? 0;

  const payload = {
    project_id: projectId,
    investment_type: item.investment_type,
    item_description: item.item_description,
    quantity,
    unit_amount: unitAmount,
    // Total sempre derivado de quantidade x valor unitário.
    planned_amount: quantity * unitAmount,
    details: item.details ?? null,
    sort_order: item.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (item.id) {
    const { data, error } = await db
      .from("project_budget_items")
      .update(payload)
      .eq("id", item.id)
      .eq("project_id", projectId)
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao atualizar item do orçamento: ${error.message}`);
    return data as ProjectBudgetItem;
  }

  const { data, error } = await db
    .from("project_budget_items")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`Falha ao criar item do orçamento: ${error.message}`);
  return data as ProjectBudgetItem;
}

export async function deleteProjectBudgetItem(
  projectId: string,
  itemId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("project_budget_items")
    .delete()
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) throw new Error(`Falha ao remover item do orçamento: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Write – planned transfers
// ---------------------------------------------------------------------------

export async function upsertProjectPlannedTransfer(
  projectId: string,
  transfer: Partial<ProjectPlannedTransfer> & { reference_date: string },
): Promise<ProjectPlannedTransfer> {
  const supabase = createClient();
  const db = supabase as any;

  const payload = {
    project_id: projectId,
    reference_date: transfer.reference_date,
    planned_amount: transfer.planned_amount ?? 0,
    realized_amount: transfer.realized_amount ?? null,
    realized_at: transfer.realized_at ?? null,
    description: transfer.description ?? null,
    updated_at: new Date().toISOString(),
  };

  if (transfer.id) {
    const { data, error } = await db
      .from("project_planned_transfers")
      .update(payload)
      .eq("id", transfer.id)
      .eq("project_id", projectId)
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao atualizar repasse: ${error.message}`);
    return data as ProjectPlannedTransfer;
  }

  const { data, error } = await db
    .from("project_planned_transfers")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`Falha ao criar repasse: ${error.message}`);
  return data as ProjectPlannedTransfer;
}

export async function deleteProjectPlannedTransfer(
  projectId: string,
  transferId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("project_planned_transfers")
    .delete()
    .eq("id", transferId)
    .eq("project_id", projectId);

  if (error) throw new Error(`Falha ao remover repasse: ${error.message}`);
}
