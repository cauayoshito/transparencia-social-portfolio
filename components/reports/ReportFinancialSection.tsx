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
  saveFinancialItemAction,
  deleteFinancialItemAction,
  saveReallocationAction,
  deleteReallocationAction,
  saveReceiptAction,
  deleteReceiptAction,
  saveBankStatementAction,
  deleteBankStatementAction,
} from "@/app/actions/report-financial.actions";

import type {
  FinancialItem,
  FinancialSummary,
  Reallocation,
  Receipt,
  BankStatement,
} from "@/services/report-financial.service";

type Props = {
  reportId: string;
  canEdit: boolean;
  items: FinancialItem[];
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

const INVESTMENT_TYPES = [
  "Comunicação",
  "Materiais e Equipamentos",
  "Recursos Humanos",
  "Transporte e alimentação",
  "Infraestrutura",
  "Serviços de terceiros",
  "Outros",
];

export default function ReportFinancialSection({
  reportId,
  canEdit,
  items,
  summary,
  reallocations,
  receipts,
  bankStatements,
}: Props) {
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
          (1) Orçamento previsto, (2) Gasto total, (3) Remanejados Total, (4) Saldo anterior,
          (5) Gastos deste relatório, (6) Remanejamentos deste relatório
        </p>

        {/* Tabela de itens */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-blue-50 text-xs font-semibold text-slate-700">
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Orçamento (1)</th>
                <th className="px-3 py-2 text-right">Gasto total (2)</th>
                <th className="px-3 py-2 text-right">Remanej. (3)</th>
                <th className="px-3 py-2 text-right">Saldo ant. (4)</th>
                <th className="px-3 py-2 text-right">Gastos (5)</th>
                <th className="px-3 py-2 text-right">Remanej. (6)</th>
                <th className="px-3 py-2 text-right">Saldo Atual</th>
                {canEdit && <th className="px-3 py-2 w-16">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{item.investment_type}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{item.item_description}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.budget_planned)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.total_spent)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.total_reallocated)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.previous_balance)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.period_expenses)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.period_realloc)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.current_balance)}</td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <form action={deleteFinancialItemAction}>
                        <input type="hidden" name="report_id" value={reportId} />
                        <input type="hidden" name="item_id" value={item.id} />
                        <button className="text-rose-600 hover:underline">Excluir</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="px-3 py-6 text-center text-slate-500">
                    Nenhum item financeiro cadastrado.
                  </td>
                </tr>
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

        {/* Formulário para adicionar item */}
        {canEdit && (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Adicionar item financeiro</h4>
            <form action={saveFinancialItemAction} className="grid gap-3 sm:grid-cols-4">
              <input type="hidden" name="report_id" value={reportId} />

              <div>
                <label className="mb-1 block text-xs text-slate-600">Tipo Investimento</label>
                <select name="investment_type" required className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Escolha um Item</option>
                  {INVESTMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">Item</label>
                <input name="item_description" required className="w-full rounded border px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">Orçamento (R$)</label>
                <input name="budget_planned" inputMode="decimal" className="w-full rounded border px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">Gasto Efetivo (R$)</label>
                <input name="period_expenses" inputMode="decimal" className="w-full rounded border px-3 py-2 text-sm" />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
                  Salvar Gasto
                </button>
              </div>
            </form>
          </div>
        )}

        {canEdit && (
          <div className="border-t border-slate-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            <strong>Resumo automático:</strong> os 5 valores acima são
            calculados a partir do orçamento previsto e dos repasses cadastrados
            na aba <strong>Financeiro do projeto</strong> e das despesas
            lançadas neste relatório. Para alterá-los, edite os dados na origem.
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
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Salvar Remanejamento</h4>
            <form action={saveReallocationAction} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="report_id" value={reportId} />
              <div>
                <label className="mb-1 block text-xs text-slate-600">Tipo Anterior</label>
                <input name="original_type" required className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Item Anterior</label>
                <input name="original_item" required className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Vl Previsto (R$)</label>
                <input name="original_value" inputMode="decimal" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Novo Tipo</label>
                <select name="new_type" className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Escolha um Item</option>
                  {INVESTMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Novo Item</label>
                <input name="new_item" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Valor Remanejado (R$)</label>
                <input name="reallocated_value" inputMode="decimal" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
                  Salvar Remanejamento
                </button>
              </div>
            </form>
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
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Adicionar recibo</h4>
            <form action={saveReceiptAction} className="grid gap-3 sm:grid-cols-3" encType="multipart/form-data">
              <input type="hidden" name="report_id" value={reportId} />
              <div>
                <label className="mb-1 block text-xs text-slate-600">Item do Planejamento</label>
                <select name="planning_item" required className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Escolha um Item</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.item_description}>{it.item_description}</option>
                  ))}
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Item da Nota</label>
                <input name="receipt_description" required className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Valor (R$)</label>
                <input name="receipt_value" inputMode="decimal" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Enviar a Nota Fiscal</label>
                <input name="receipt_file" type="file" accept="image/*,application/pdf" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Número da Nota</label>
                <input name="receipt_number" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Data</label>
                <input name="receipt_date" type="date" className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Item Remanejado</span>
                  <select name="is_reallocated" className="rounded border px-2 py-1 text-sm">
                    <option value="false">NÃO</option>
                    <option value="true">SIM</option>
                  </select>
                </label>
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
                  Salvar Recibo
                </button>
              </div>
            </form>
          </div>
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
    </div>
  );
}
