import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Service: Dados financeiros do relatório (seções 12-15 do PHI)
// ============================================================================

// --- Types ---

export type FinancialItem = {
  id: string;
  report_id: string;
  investment_type: string;
  item_description: string;
  budget_planned: number;
  total_spent: number;
  total_reallocated: number;
  previous_balance: number;
  period_expenses: number;
  period_realloc: number;
  current_balance: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FinancialSummary = {
  id: string;
  report_id: string;
  planned_balance: number;
  previous_balance: number;
  period_transfer: number;
  actual_expenses: number;
  account_balance: number;
};

export type Reallocation = {
  id: string;
  report_id: string;
  original_type: string;
  original_item: string;
  original_value: number;
  new_type: string | null;
  new_item: string | null;
  reallocated_value: number;
  sort_order: number;
};

export type Receipt = {
  id: string;
  report_id: string;
  planning_item: string;
  receipt_description: string;
  receipt_value: number;
  receipt_number: string | null;
  receipt_date: string | null;
  is_reallocated: boolean;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  sort_order: number;
};

export type BankStatement = {
  id: string;
  report_id: string;
  label: string;
  status: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
};

// --- Financial Items (seção 12) ---

export async function listFinancialItems(reportId: string): Promise<FinancialItem[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("report_financial_items")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Falha ao listar itens financeiros: ${error.message}`);
  return (data ?? []) as FinancialItem[];
}

export async function upsertFinancialItem(
  reportId: string,
  item: Partial<FinancialItem> & { investment_type: string; item_description: string }
): Promise<FinancialItem> {
  const supabase = createClient();
  const db = supabase as any;

  const payload = {
    report_id: reportId,
    investment_type: item.investment_type,
    item_description: item.item_description,
    budget_planned: item.budget_planned ?? 0,
    total_spent: item.total_spent ?? 0,
    total_reallocated: item.total_reallocated ?? 0,
    previous_balance: item.previous_balance ?? 0,
    period_expenses: item.period_expenses ?? 0,
    period_realloc: item.period_realloc ?? 0,
    current_balance: item.current_balance ?? 0,
    sort_order: item.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (item.id) {
    const { data, error } = await db
      .from("report_financial_items")
      .update(payload)
      .eq("id", item.id)
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao atualizar item financeiro: ${error.message}`);
    return data as FinancialItem;
  }

  const { data, error } = await db
    .from("report_financial_items")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`Falha ao criar item financeiro: ${error.message}`);
  return data as FinancialItem;
}

export async function deleteFinancialItem(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("report_financial_items")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(`Falha ao excluir item financeiro: ${error.message}`);
}

// --- Financial Summary ---

export async function getFinancialSummary(reportId: string): Promise<FinancialSummary | null> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("report_financial_summary")
    .select("*")
    .eq("report_id", reportId)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar resumo financeiro: ${error.message}`);
  return data as FinancialSummary | null;
}

/**
 * @deprecated A tabela report_financial_summary foi substituída por uma VIEW
 * calculada automaticamente. Esta função existe apenas para compatibilidade
 * com chamadas legadas e é um no-op: retorna o resumo atual da VIEW sem
 * persistir nada. Tentar fazer UPSERT na VIEW geraria erro do Postgres.
 */
export async function upsertFinancialSummary(
  reportId: string,
  _summary: Partial<FinancialSummary>
): Promise<FinancialSummary> {
  const current = await getFinancialSummary(reportId);
  if (!current) {
    return {
      report_id: reportId,
      planned_balance: 0,
      previous_balance: 0,
      period_transfer: 0,
      actual_expenses: 0,
      account_balance: 0,
    } as FinancialSummary;
  }
  return current;
}

// --- Reallocations (seção 13) ---

export async function listReallocations(reportId: string): Promise<Reallocation[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("report_reallocations")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Falha ao listar remanejamentos: ${error.message}`);
  return (data ?? []) as Reallocation[];
}

export async function upsertReallocation(
  reportId: string,
  item: Partial<Reallocation> & {
    original_type: string;
    original_item: string;
    original_budget_item_id?: string | null;
    new_budget_item_id?: string | null;
  }
): Promise<Reallocation> {
  const supabase = createClient();
  const db = supabase as any;

  const payload = {
    report_id: reportId,
    original_type: item.original_type,
    original_item: item.original_item,
    original_value: item.original_value ?? 0,
    original_budget_item_id: item.original_budget_item_id ?? null,
    new_budget_item_id: item.new_budget_item_id ?? null,
    new_type: item.new_type ?? null,
    new_item: item.new_item ?? null,
    reallocated_value: item.reallocated_value ?? 0,
    sort_order: item.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (item.id) {
    const { data, error } = await db
      .from("report_reallocations")
      .update(payload)
      .eq("id", item.id)
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao atualizar remanejamento: ${error.message}`);
    return data as Reallocation;
  }

  const { data, error } = await db
    .from("report_reallocations")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`Falha ao criar remanejamento: ${error.message}`);
  return data as Reallocation;
}

export async function deleteReallocation(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("report_reallocations")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(`Falha ao excluir remanejamento: ${error.message}`);
}

// --- Receipts (seção 14) ---

export async function listReceipts(reportId: string): Promise<Receipt[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("report_receipts")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Falha ao listar recibos: ${error.message}`);
  return (data ?? []) as Receipt[];
}

export async function upsertReceipt(
  reportId: string,
  item: Partial<Receipt> & {
    planning_item: string;
    receipt_description: string;
    budget_item_id?: string | null;
  }
): Promise<Receipt> {
  const supabase = createClient();
  const db = supabase as any;

  const payload = {
    report_id: reportId,
    budget_item_id: (item as any).budget_item_id ?? null,
    planning_item: item.planning_item,
    receipt_description: item.receipt_description,
    receipt_value: item.receipt_value ?? 0,
    receipt_number: item.receipt_number ?? null,
    receipt_date: item.receipt_date ?? null,
    is_reallocated: item.is_reallocated ?? false,
    file_path: item.file_path ?? null,
    file_name: item.file_name ?? null,
    file_size: item.file_size ?? null,
    mime_type: item.mime_type ?? null,
    sort_order: item.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (item.id) {
    const { data, error } = await db
      .from("report_receipts")
      .update(payload)
      .eq("id", item.id)
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao atualizar recibo: ${error.message}`);
    return data as Receipt;
  }

  const { data, error } = await db
    .from("report_receipts")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`Falha ao criar recibo: ${error.message}`);
  return data as Receipt;
}

export async function deleteReceipt(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("report_receipts")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(`Falha ao excluir recibo: ${error.message}`);
}

// --- Bank Statements (seção 15) ---

export async function listBankStatements(reportId: string): Promise<BankStatement[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("report_bank_statements")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Falha ao listar extratos: ${error.message}`);
  return (data ?? []) as BankStatement[];
}

export async function createBankStatement(
  reportId: string,
  item: { label: string; file_path?: string; file_name?: string; file_size?: number; mime_type?: string }
): Promise<BankStatement> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("report_bank_statements")
    .insert({
      report_id: reportId,
      label: item.label,
      status: "ENVIADA",
      file_path: item.file_path ?? null,
      file_name: item.file_name ?? null,
      file_size: item.file_size ?? null,
      mime_type: item.mime_type ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Falha ao criar extrato: ${error.message}`);
  return data as BankStatement;
}

export async function deleteBankStatement(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("report_bank_statements")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(`Falha ao excluir extrato: ${error.message}`);
}

// --- Agregação completa para a página de edição ---

export async function getReportFinancialData(reportId: string) {
  const [items, summary, reallocations, receipts, bankStatements] = await Promise.all([
    listFinancialItems(reportId).catch(() => []),
    getFinancialSummary(reportId).catch(() => null),
    listReallocations(reportId).catch(() => []),
    listReceipts(reportId).catch(() => []),
    listBankStatements(reportId).catch(() => []),
  ]);

  return { items, summary, reallocations, receipts, bankStatements };
}

// --- Agregação financeira por PROJETO (para aba Financeiro do projeto) ---

export type ProjectFinancialAggregation = {
  /** Todos os itens financeiros de todos os relatórios do projeto */
  items: (FinancialItem & { report_title: string })[];
  /** Todos os recibos de todos os relatórios */
  receipts: (Receipt & { report_title: string })[];
  /** Todos os extratos bancários de todos os relatórios */
  bankStatements: (BankStatement & { report_title: string })[];
  /** Resumo consolidado: soma de todos os summaries */
  totals: {
    total_budget_planned: number;
    total_spent: number;
    total_receipts_value: number;
    total_bank_statements: number;
    total_items: number;
  };
};

export async function getProjectFinancialAggregation(
  projectId: string
): Promise<ProjectFinancialAggregation> {
  const supabase = createClient();
  const db = supabase as any;

  // Buscar relatórios finalizados do projeto (SUBMITTED ou APPROVED).
  // DRAFT reports are excluded from the financial aggregation: they are
  // incomplete and investors should only see committed/reviewed data.
  const { data: reports, error: repErr } = await db
    .from("reports")
    .select("id, title, period_start, period_end, status")
    .eq("project_id", projectId)
    .in("status", ["SUBMITTED", "APPROVED"])
    .order("period_start", { ascending: true });

  if (repErr || !reports || reports.length === 0) {
    return {
      items: [],
      receipts: [],
      bankStatements: [],
      totals: {
        total_budget_planned: 0,
        total_spent: 0,
        total_receipts_value: 0,
        total_bank_statements: 0,
        total_items: 0,
      },
    };
  }

  const reportIds = reports.map((r: any) => r.id);
  const reportMap = new Map<string, string>();
  for (const r of reports) {
    const label =
      r.title && r.title.trim()
        ? r.title
        : `Relatório ${String(r.period_start ?? "").slice(0, 10)} → ${String(r.period_end ?? "").slice(0, 10)}`;
    reportMap.set(r.id, label);
  }

  // Buscar em paralelo: itens financeiros, recibos e extratos de TODOS os relatórios
  const [itemsRaw, receiptsRaw, statementsRaw] = await Promise.all([
    db
      .from("report_financial_items")
      .select("*")
      .in("report_id", reportIds)
      .order("sort_order", { ascending: true })
      .then((res: any) => res.data ?? []),
    db
      .from("report_receipts")
      .select("*")
      .in("report_id", reportIds)
      .order("sort_order", { ascending: true })
      .then((res: any) => res.data ?? []),
    db
      .from("report_bank_statements")
      .select("*")
      .in("report_id", reportIds)
      .order("created_at", { ascending: true })
      .then((res: any) => res.data ?? []),
  ]);

  const items = (itemsRaw as FinancialItem[]).map((i) => ({
    ...i,
    report_title: reportMap.get(i.report_id) ?? "Relatório",
  }));

  const receipts = (receiptsRaw as Receipt[]).map((r) => ({
    ...r,
    report_title: reportMap.get(r.report_id) ?? "Relatório",
  }));

  const bankStatements = (statementsRaw as BankStatement[]).map((b) => ({
    ...b,
    report_title: reportMap.get(b.report_id) ?? "Relatório",
  }));

  const totals = {
    total_budget_planned: items.reduce((sum, i) => sum + Number(i.budget_planned ?? 0), 0),
    total_spent: items.reduce((sum, i) => sum + Number(i.period_expenses ?? 0), 0),
    total_receipts_value: receipts.reduce((sum, r) => sum + Number(r.receipt_value ?? 0), 0),
    total_bank_statements: bankStatements.length,
    total_items: items.length,
  };

  return { items, receipts, bankStatements, totals };
}
