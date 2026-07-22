/**
 * Seções financeiras do relatório (12-15 do protótipo PHI)
 * Renderizadas dentro da página de edição do relatório.
 *
 * - Relatório financeiro (tabela de itens orçamentários)
 * - Relatório de remanejamento
 * - Relação de recibos e notas fiscais
 * - Extratos bancários
 */

import {
  deleteReallocationAction,
  deleteReceiptAction,
  saveBankStatementAction,
  deleteBankStatementAction,
  saveReportTransferAction,
  deleteReportTransferAction,
} from "@/app/actions/report-financial.actions";
import ReportReceiptForm from "@/components/reports/ReportReceiptForm";
import ReportReallocationForm from "@/components/reports/ReportReallocationForm";

import type {
  FinancialItem,
  FinancialSummary,
  Reallocation,
  Receipt,
  BankStatement,
} from "@/services/report-financial.service";

type BudgetItemLite = {
  id: string;
  investment_type: string;
  item_description: string;
  planned_amount: number;
};

type ReportTransfer = {
  id: string;
  amount: number;
  transfer_date: string | null;
  transfer_type: string | null;
};

type Props = {
  reportId: string;
  canEdit: boolean;
  items: FinancialItem[];
  /** Itens do orçamento previsto do projeto (fonte das linhas). */
  budgetItems: BudgetItemLite[];
  /** Repasses do recurso lançados neste relatório. */
  transfers: ReportTransfer[];
  summary: FinancialSummary | null;
  reallocations: Reallocation[];
  receipts: Receipt[];
  bankStatements: BankStatement[];
};

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function formatDate(v: string | null | undefined) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
  } catch {
    return v;
  }
}

export default function ReportFinancialSection({
  reportId,
  canEdit,
  items,
  budgetItems,
  transfers,
  summary,
  reallocations,
  receipts,
  bankStatements,
}: Props) {
  // Gasto por item de orçamento = SOMA dos recibos/notas fiscais vinculados.
  const gastoByBudget = new Map<string, number>();
  for (const r of receipts) {
    const bid = (r as any).budget_item_id;
    if (!bid) continue;
    gastoByBudget.set(
      String(bid),
      (gastoByBudget.get(String(bid)) ?? 0) + Number(r.receipt_value ?? 0),
    );
  }

  // Remanejamento: sai da origem, entra no destino (ajusta o disponível).
  const remanejByBudget = new Map<string, number>();
  const addRem = (id: string | null | undefined, delta: number) => {
    if (!id) return;
    remanejByBudget.set(String(id), (remanejByBudget.get(String(id)) ?? 0) + delta);
  };
  for (const a of reallocations as any[]) {
    const v = Number(a.reallocated_value ?? 0);
    addRem(a.original_budget_item_id, -v);
    addRem(a.new_budget_item_id, v);
  }

  const disponivelDe = (b: BudgetItemLite) =>
    Number(b.planned_amount) -
    (gastoByBudget.get(b.id) ?? 0) +
    (remanejByBudget.get(b.id) ?? 0);

  // Itens do orçamento com disponível, para o formulário de remanejamento.
  const budgetItemsComDisponivel = budgetItems.map((b) => ({
    id: b.id,
    investment_type: b.investment_type,
    item_description: b.item_description,
    disponivel: disponivelDe(b),
  }));

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* Relatório financeiro */}
      {/* ============================================================ */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
          Relatório financeiro
</div>
        <p className="px-4 pt-3 text-xs text-slate-600">
          Os itens vêm do <strong>Orçamento previsto do projeto</strong>. O{" "}
          <strong>gasto no período</strong> é a soma das notas fiscais lançadas
          em <strong>Relação de recibos e notas fiscais</strong>; o disponível é
          calculado automaticamente.
        </p>

        {/* Itens puxados do orçamento do projeto (gasto vem dos recibos) */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-blue-50 text-xs font-semibold text-slate-700">
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Orçamento previsto</th>
                <th className="px-3 py-2 text-right">Gasto no período</th>
                <th className="px-3 py-2 text-right">Disponível</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Nenhum item no orçamento previsto do projeto. Cadastre na aba
                    Financeiro do projeto.
                  </td>
                </tr>
              ) : (
                budgetItems.map((b) => {
                  const gasto = gastoByBudget.get(b.id) ?? 0;
                  const disponivel = disponivelDe(b);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">{b.investment_type}</td>
                      <td className="max-w-[200px] px-3 py-2">{b.item_description}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(b.planned_amount)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(gasto)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${disponivel < 0 ? "text-rose-600" : ""}`}>
                        {formatCurrency(disponivel)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo financeiro (calculado automaticamente a partir do orçamento do projeto, repasses realizados e despesas dos relatórios) */}
        <div className="border-t border-slate-200 p-4">
          <div className="mx-auto max-w-sm">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">
                Resumo financeiro
              </h4>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Calculado automaticamente
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium text-slate-700">Saldo Planejado</td>
                  <td className="py-2 text-right font-semibold">{formatCurrency(summary?.planned_balance)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-slate-700">Saldo anterior</td>
                  <td className="py-2 text-right">{formatCurrency(summary?.previous_balance)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-slate-700">Repasse no período</td>
                  <td className="py-2 text-right">{formatCurrency(summary?.period_transfer)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-slate-700">Gasto real</td>
                  <td className="py-2 text-right">{formatCurrency(summary?.actual_expenses)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-semibold text-slate-900">Saldo em conta</td>
                  <td className="py-2 text-right font-bold text-slate-900">{formatCurrency(summary?.account_balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {canEdit && (
          <div className="border-t border-slate-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            <strong>Resumo automático:</strong> os valores acima são calculados
            a partir do orçamento previsto e dos repasses cadastrados na aba{" "}
            <strong>Financeiro do projeto</strong> e dos gastos lançados neste
            relatório. Para alterar o orçamento, edite na origem.
          </div>
        )}
      </section>
      {/* ============================================================ */}
      {/* Relação de recibos e notas fiscais */}
      {/* ============================================================ */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
          Relação de recibos e notas fiscais
        </div>
        <p className="px-4 pt-3 text-xs text-slate-600">
          Não serão aceitas notas fiscais fora do período de atividades do relatório.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-blue-50 text-xs font-semibold text-slate-700">
                <th className="px-3 py-2">Item Planejamento</th>
                <th className="px-3 py-2">Item da Nota</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2">Número</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Remanejado?</th>
                {canEdit && <th className="px-3 py-2 w-16">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{r.planning_item}</td>
                  <td className="px-3 py-2">{r.receipt_description}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.receipt_value)}</td>
                  <td className="px-3 py-2">{r.receipt_number ?? "-"}</td>
                  <td className="px-3 py-2">{formatDate(r.receipt_date)}</td>
                  <td className="px-3 py-2">{r.is_reallocated ? "SIM" : "NÃO"}</td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <form action={deleteReceiptAction}>
                        <input type="hidden" name="report_id" value={reportId} />
                        <input type="hidden" name="item_id" value={r.id} />
                        <button className="text-rose-600 hover:underline">Excluir</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-3 py-6 text-center text-slate-500">
                    Nenhum recibo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <ReportReceiptForm reportId={reportId} budgetItems={budgetItems} />
        )}
      </section>
      {/* ============================================================ */}
      {/* Repasse do recurso */}
      {/* ============================================================ */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
          Repasse do recurso
        </div>
        <p className="px-4 pt-3 text-xs text-slate-600">
          Lance os repasses recebidos no período (valor, data e tipo). A soma
          alimenta o <strong>Repasse no período</strong> do resumo financeiro.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-emerald-50 text-xs font-semibold text-slate-700">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Valor</th>
                {canEdit && <th className="px-3 py-2 w-16">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 4 : 3} className="px-3 py-6 text-center text-slate-500">
                    Nenhum repasse lançado.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{formatDate(t.transfer_date)}</td>
                    <td className="px-3 py-2">{t.transfer_type ?? "-"}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(t.amount)}</td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <form action={deleteReportTransferAction}>
                          <input type="hidden" name="report_id" value={reportId} />
                          <input type="hidden" name="transfer_id" value={t.id} />
                          <button className="text-rose-600 hover:underline">Excluir</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Lançar repasse</h4>
            <form action={saveReportTransferAction} className="grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="report_id" value={reportId} />
              <div>
                <label className="mb-1 block text-xs text-slate-600">Valor (R$)</label>
                <input name="amount" inputMode="decimal" required className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Data</label>
                <input name="transfer_date" type="date" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Tipo</label>
                <select name="transfer_type" className="w-full rounded border px-3 py-2 text-sm">
                  <option value="Repasse único">Repasse único</option>
                  <option value="Parcela">Parcela</option>
                </select>
              </div>
              <div className="flex items-end justify-end">
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
                  Lançar repasse
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
      {/* ============================================================ */}
      {/* Relatório de remanejamento */}
      {/* ============================================================ */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
          Relatório de remanejamento
        </div>
        <p className="px-4 pt-3 text-xs text-slate-600">
          Caso algum recurso tenha sido previsto para uma finalidade e utilizado em outra.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-blue-50 text-xs font-semibold text-slate-700">
                <th className="px-3 py-2">Tipo Investimento</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Vl Previsto</th>
                <th className="px-3 py-2">Novo Tipo</th>
                <th className="px-3 py-2">Novo Item</th>
                <th className="px-3 py-2 text-right">Vl Remanejado</th>
                {canEdit && <th className="px-3 py-2 w-16">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reallocations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{r.original_type}</td>
                  <td className="px-3 py-2">{r.original_item}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.original_value)}</td>
                  <td className="px-3 py-2">{r.new_type ?? "-"}</td>
                  <td className="px-3 py-2">{r.new_item ?? "-"}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.reallocated_value)}</td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <form action={deleteReallocationAction}>
                        <input type="hidden" name="report_id" value={reportId} />
                        <input type="hidden" name="item_id" value={r.id} />
                        <button className="text-rose-600 hover:underline">Excluir</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {reallocations.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-3 py-6 text-center text-slate-500">
                    Nenhum remanejamento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <ReportReallocationForm
            reportId={reportId}
            budgetItems={budgetItemsComDisponivel}
          />
        )}
      </section>
      {/* ============================================================ */}
      {/* Extratos Bancários */}
      {/* ============================================================ */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
          Extratos Bancários
        </div>

        <div className="p-4">
          {bankStatements.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-4">
              Nenhum extrato bancário enviado.
            </p>
          ) : (
            <div className="space-y-2">
              {bankStatements.map((bs) => (
                <div key={bs.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {bs.status}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{bs.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {canEdit && (
                      <form action={deleteBankStatementAction}>
                        <input type="hidden" name="report_id" value={reportId} />
                        <input type="hidden" name="item_id" value={bs.id} />
                        <button className="text-sm text-rose-600 hover:underline">Excluir</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <form action={saveBankStatementAction} className="flex flex-wrap items-end gap-3" encType="multipart/form-data">
              <input type="hidden" name="report_id" value={reportId} />
              <div>
                <label className="mb-1 block text-xs text-slate-600">Arquivo do extrato</label>
                <input name="statement_file" type="file" accept="image/*,application/pdf" required className="rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Nome/Label</label>
                <input name="label" placeholder="Ex: Extrato 01" className="rounded border px-3 py-2 text-sm" />
              </div>
              <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
                Enviar Extrato
              </button>
            </form>
          </div>
        )}
      </section>

@@SEC::Relatório de remanejamento@@

@@SEC::Relação de recibos e notas fiscais@@

@@SEC::Extratos Bancários@@
    </div>
  );
}
