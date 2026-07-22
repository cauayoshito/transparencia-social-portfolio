"use client";

import { useMemo, useState } from "react";
import { saveReceiptAction } from "@/app/actions/report-financial.actions";

export type BudgetItemLite = {
  id: string;
  investment_type: string;
  item_description: string;
};

type Props = {
  reportId: string;
  budgetItems: BudgetItemLite[];
};

/**
 * Formulário de recibo/nota fiscal com seleção em cascata:
 * Tipo (investment_type do orçamento) → Item (item_description do tipo).
 * O item selecionado vincula o recibo ao item do orçamento (budget_item_id),
 * e o gasto no período do Relatório financeiro é a soma desses recibos.
 */
export default function ReportReceiptForm({ reportId, budgetItems }: Props) {
  const tipos = useMemo(
    () => Array.from(new Set(budgetItems.map((b) => b.investment_type))),
    [budgetItems],
  );

  const [tipo, setTipo] = useState("");
  const [budgetItemId, setBudgetItemId] = useState("");

  const itensDoTipo = useMemo(
    () => budgetItems.filter((b) => b.investment_type === tipo),
    [budgetItems, tipo],
  );

  const itemSelecionado = budgetItems.find((b) => b.id === budgetItemId);

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-700">
        Adicionar recibo / nota fiscal
      </h4>
      <form
        action={saveReceiptAction}
        className="grid gap-3 sm:grid-cols-3"
        encType="multipart/form-data"
      >
        <input type="hidden" name="report_id" value={reportId} />
        <input type="hidden" name="budget_item_id" value={budgetItemId} />
        <input
          type="hidden"
          name="planning_item"
          value={itemSelecionado?.item_description ?? ""}
        />

        <div>
          <label className="mb-1 block text-xs text-slate-600">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setBudgetItemId("");
            }}
            required
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Escolha um tipo</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Item do planejamento
          </label>
          <select
            value={budgetItemId}
            onChange={(e) => setBudgetItemId(e.target.value)}
            required
            disabled={!tipo}
            className="w-full rounded border px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">
              {tipo ? "Escolha um item" : "Selecione o tipo primeiro"}
            </option>
            {itensDoTipo.map((b) => (
              <option key={b.id} value={b.id}>
                {b.item_description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Item da nota
          </label>
          <input
            name="receipt_description"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-600">Valor (R$)</label>
          <input
            name="receipt_value"
            inputMode="decimal"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Enviar a nota fiscal
          </label>
          <input
            name="receipt_file"
            type="file"
            accept="image/*,application/pdf"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Número da nota
          </label>
          <input
            name="receipt_number"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-600">Data</label>
          <input
            name="receipt_date"
            type="date"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Remanejado</span>
            <select
              name="is_reallocated"
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="false">NÃO</option>
              <option value="true">SIM</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end sm:col-span-3">
          <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
            Salvar recibo
          </button>
        </div>
      </form>
    </div>
  );
}
