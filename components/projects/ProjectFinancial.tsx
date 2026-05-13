import {
  saveProjectBudgetItemAction,
  deleteProjectBudgetItemAction,
  saveProjectPlannedTransferAction,
  deleteProjectPlannedTransferAction,
} from "@/app/actions/project-budget.actions";

import type {
  FinancialItem,
  Receipt,
  BankStatement,
  ProjectFinancialAggregation,
} from "@/services/report-financial.service";
import type { ProjectBudgetSnapshot } from "@/services/project-budget.service";

type AttachmentItem = {
  reportId: string;
  reportTitle: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  description: string | null;
};

type Props = {
  projectId: string;
  role?: string;
  /** Quando false, todos os formulários ficam ocultos (somente leitura). */
  canEdit: boolean;
  /** Orçamento e repasses cadastrados no projeto (entrada de dados). */
  budget: ProjectBudgetSnapshot;
  /** Execução consolidada vinda dos relatórios. */
  financialData: ProjectFinancialAggregation;
  legacyReceipts?: AttachmentItem[];
  legacyBankStatements?: AttachmentItem[];
  legacyOthers?: AttachmentItem[];
};

const INVESTMENT_TYPES = [
  "Comunicação",
  "Materiais e Equipamentos",
  "Recursos Humanos",
  "Transporte e alimentação",
  "Infraestrutura",
  "Serviços de terceiros",
  "Outros",
];

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
  } catch {
    return value;
  }
}

export default function ProjectFinancial({
  projectId,
  role,
  canEdit,
  budget,
  financialData,
  legacyReceipts = [],
  legacyBankStatements = [],
  legacyOthers = [],
}: Props) {
  const { items, receipts, bankStatements } = financialData;
  const isInvestor = role === "INVESTOR";

  const hasNormalizedData =
    items.length > 0 || receipts.length > 0 || bankStatements.length > 0;
  const hasLegacyData =
    legacyReceipts.length > 0 ||
    legacyBankStatements.length > 0 ||
    legacyOthers.length > 0;

  const totalExecutado = items.reduce(
    (s, i) => s + Number(i.period_expenses ?? 0),
    0,
  );
  const totalPrevisto = budget.totals.total_planned;
  const saldoProjetado = totalPrevisto - totalExecutado;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Orçamento previsto</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(totalPrevisto)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {budget.items.length}{" "}
            {budget.items.length === 1 ? "linha" : "linhas"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Repasses realizados</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(budget.totals.total_transfers_realized)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            de {formatCurrency(budget.totals.total_transfers_planned)} previstos
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Executado</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(totalExecutado)}
          </p>
          <p className="mt-1 text-xs text-slate-500">vindo dos relatórios</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Saldo projetado</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              saldoProjetado >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {formatCurrency(saldoProjetado)}
          </p>
          <p className="mt-1 text-xs text-slate-500">previsto − executado</p>
        </div>
      </section>

      {/* 1. Orçamento previsto */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            Orçamento previsto do projeto
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre as despesas previstas. Esses valores alimentam o{" "}
            <strong>Saldo Planejado</strong> do resumo de cada relatório.
          </p>
        </div>

        {budget.items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhum item de orçamento cadastrado.
            {canEdit ? " Use o formulário abaixo para adicionar." : ""}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-blue-50 text-xs font-semibold text-slate-700">
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Valor previsto</th>
                  {canEdit && <th className="w-16 px-3 py-2">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budget.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{item.investment_type}</td>
                    <td className="max-w-[260px] truncate px-3 py-2">
                      {item.item_description}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(Number(item.planned_amount))}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <form action={deleteProjectBudgetItemAction}>
                          <input type="hidden" name="project_id" value={projectId} />
                          <input type="hidden" name="item_id" value={item.id} />
                          <button
                            type="submit"
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remover
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="px-3 py-2.5" colSpan={2}>
                    Total previsto
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {formatCurrency(totalPrevisto)}
                  </td>
                  {canEdit && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {canEdit && (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Adicionar item ao orçamento
            </h3>
            <form
              action={saveProjectBudgetItemAction}
              className="grid gap-3 sm:grid-cols-4"
            >
              <input type="hidden" name="project_id" value={projectId} />

              <div>
                <label className="mb-1 block text-xs text-slate-600">Tipo</label>
                <select
                  name="investment_type"
                  required
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Escolha um tipo</option>
                  {INVESTMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">
                  Descrição do item
                </label>
                <input
                  name="item_description"
                  required
                  placeholder="Ex: Educador Social 1"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Valor previsto (R$)
                </label>
                <input
                  name="planned_amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end sm:col-span-4">
                <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                  Adicionar item
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* 2. Cronograma de repasses */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            Cronograma de repasses
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Repasses previstos pelo financiador. Quando um repasse for
            efetivado, preencha <strong>Valor realizado</strong> e{" "}
            <strong>Data do crédito</strong> — o resumo financeiro do relatório
            usa esses valores no cálculo do <strong>Repasse no período</strong>.
          </p>
        </div>

        {budget.transfers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhum repasse cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-emerald-50 text-xs font-semibold text-slate-700">
                  <th className="px-3 py-2">Data prevista</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2 text-right">Valor previsto</th>
                  <th className="px-3 py-2 text-right">Valor realizado</th>
                  <th className="px-3 py-2">Data do crédito</th>
                  {canEdit && <th className="w-16 px-3 py-2">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budget.transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{formatDate(t.reference_date)}</td>
                    <td className="max-w-[200px] truncate px-3 py-2">
                      {t.description ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(Number(t.planned_amount))}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {t.realized_amount != null
                        ? formatCurrency(Number(t.realized_amount))
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{formatDate(t.realized_at)}</td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <form action={deleteProjectPlannedTransferAction}>
                          <input type="hidden" name="project_id" value={projectId} />
                          <input type="hidden" name="transfer_id" value={t.id} />
                          <button
                            type="submit"
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remover
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-emerald-50 font-semibold">
                  <td className="px-3 py-2.5" colSpan={2}>
                    Totais
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {formatCurrency(budget.totals.total_transfers_planned)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {formatCurrency(budget.totals.total_transfers_realized)}
                  </td>
                  <td colSpan={canEdit ? 2 : 1} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {canEdit && (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Adicionar repasse
            </h3>
            <form
              action={saveProjectPlannedTransferAction}
              className="grid gap-3 sm:grid-cols-6"
            >
              <input type="hidden" name="project_id" value={projectId} />

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Data prevista
                </label>
                <input
                  name="reference_date"
                  type="date"
                  required
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">
                  Descrição
                </label>
                <input
                  name="description"
                  placeholder="Ex: 1ª parcela"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Valor previsto (R$)
                </label>
                <input
                  name="planned_amount"
                  inputMode="decimal"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Valor realizado (R$)
                </label>
                <input
                  name="realized_amount"
                  inputMode="decimal"
                  placeholder="opcional"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  Data do crédito
                </label>
                <input
                  name="realized_at"
                  type="date"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end sm:col-span-6">
                <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                  Adicionar repasse
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* 3. Execução consolidada (read-only) */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            Execução consolidada
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Soma das despesas lançadas em todos os relatórios enviados deste
            projeto. Não editável aqui — entradas são feitas em cada relatório.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhum gasto lançado em relatórios ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-800 text-xs text-white">
                  <th className="px-3 py-2.5 font-medium">Relatório</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Item</th>
                  <th className="px-3 py-2.5 font-medium text-right">
                    Gasto no período
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50">
                    <td className="max-w-[160px] truncate px-3 py-2 text-slate-600">
                      {(item as any).report_title}
                    </td>
                    <td className="px-3 py-2">{item.investment_type}</td>
                    <td className="max-w-[200px] truncate px-3 py-2">
                      {item.item_description}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(Number(item.period_expenses))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="px-3 py-2.5" colSpan={3}>
                    Total executado
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {formatCurrency(totalExecutado)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {receipts.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Recibos e notas fiscais
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Comprovantes anexados nos relatórios deste projeto.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-emerald-50 text-xs font-semibold text-slate-700">
                  <th className="px-3 py-2">Relatório</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2">Número</th>
                  <th className="px-3 py-2">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="max-w-[140px] truncate px-3 py-2 text-slate-600">
                      {(r as any).report_title}
                    </td>
                    <td className="px-3 py-2">{r.planning_item}</td>
                    <td className="max-w-[180px] truncate px-3 py-2">
                      {r.receipt_description}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(Number(r.receipt_value))}
                    </td>
                    <td className="px-3 py-2">{r.receipt_number ?? "-"}</td>
                    <td className="px-3 py-2">{formatDate(r.receipt_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {bankStatements.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Extratos bancários
            </h2>
          </div>
          <div className="space-y-2 p-4">
            {bankStatements.map((bs) => (
              <div
                key={bs.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {bs.status ?? "ENVIADA"}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      {bs.label}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      {(bs as any).report_title}
                    </span>
                  </div>
                </div>
                {bs.file_name && (
                  <span className="text-xs text-blue-600">{bs.file_name}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {hasLegacyData && !hasNormalizedData && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Comprovantes em formato legado:</strong>{" "}
          {legacyReceipts.length} recibos, {legacyBankStatements.length}{" "}
          extratos, {legacyOthers.length} outros.
        </section>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <span className="font-medium">Como funciona:</span> o orçamento e os
        repasses cadastrados aqui são o <strong>previsto</strong> do projeto. À
        medida que cada relatório lança gastos e os repasses são marcados como
        realizados, o resumo financeiro de cada relatório é{" "}
        <strong>recalculado automaticamente</strong>.
        {isInvestor &&
          " Como financiador, você acompanha aqui o consolidado sem editar."}
      </div>
    </div>
  );
}
