"use client";

import { useMemo, useState } from "react";
import { saveReallocationAction } from "@/app/actions/report-financial.actions";

export type ReallocBudgetItem = {
  id: string;
  investment_type: string;
  item_description: string;
  disponivel: number;
};

type Props = {
  reportId: string;
  budgetItems: ReallocBudgetItem[];
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v || 0);
}

/**
 * Remanejamento com seleção em cascata:
 *  - Tipo Anterior → Item Anterior (do orçamento) → Saldo disponível (auto)
 *  - Novo Tipo → Novo Item (do orçamento, + "Outro" manual)
 *  - Valor Remanejado
 * Vincula origem e destino a itens do orçamento para ajustar o disponível.
 */
export default function ReportReallocationForm({ reportId, budgetItems }: Props) {
  const tipos = useMemo(
    () => Array.from(new Set(budgetItems.map((b) => b.investment_type))),
    [budgetItems],
  );

  const [tipoAnt, setTipoAnt] = useState("");
  const [origId, setOrigId] = useState("");
  const [novoTipo, setNovoTipo] = useState("");
  const [novoItemId, setNovoItemId] = useState("");
  const [novoItemOutro, setNovoItemOutro] = useState("");

  const itensAnt = budgetItems.filter((b) => b.investment_type === tipoAnt);
  const itensNovo = budgetItems.filter((b) => b.investment_type === novoTipo);

  const orig = budgetItems.find((b) => b.id === origId);
  const isOutro = novoItemId === "__OUTRO__";
  const novoItemObj = budgetItems.find((b) => b.id === novoItemId);

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-700">
        Salvar remanejamento
      </h4>
      <form action={saveReallocationAction} className="grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="report_id" value={reportId} />
        <input type="hidden" name="original_type" value={tipoAnt} />
        <input
          type="hidden"
          name="original_item"
          value={orig?.item_description ?? ""}
        />
        <input type="hidden" name="original_budget_item_id" value={origId} />
        <input type="hidden" name="new_type" value={novoTipo} />
        <input
          type="hidden"
          name="new_item"
          value={isOutro ? novoItemOutro : novoItemObj?.item_description ?? ""}
        />
        <input
          type="hidden"
          name="new_budget_item_id"
          value={isOutro ? "" : novoItemId}
        />

        {/* Tipo Anterior */}
        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Tipo anterior
          </label>
          <select
            value={tipoAnt}
            onChange={(e) => {
              setTipoAnt(e.target.value);
              setOrigId("");
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

        {/* Item Anterior */}
        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Item anterior
          </label>
          <select
            value={origId}
            onChange={(e) => setOrigId(e.target.value)}
            required
            disabled={!tipoAnt}
            className="w-full rounded border px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">
              {tipoAnt ? "Escolha um item" : "Selecione o tipo primeiro"}
            </option>
            {itensAnt.map((b) => (
              <option key={b.id} value={b.id}>
                {b.item_description}
              </option>
            ))}
          </select>
        </div>

        {/* Saldo disponível (auto) */}
        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Saldo disponível
          </label>
          <div className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            {orig ? formatCurrency(orig.disponivel) : "—"}
          </div>
        </div>

        {/* Novo Tipo */}
        <div>
          <label className="mb-1 block text-xs text-slate-600">Novo tipo</label>
          <select
            value={novoTipo}
            onChange={(e) => {
              setNovoTipo(e.target.value);
              setNovoItemId("");
            }}
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

        {/* Novo Item (+ Outro) */}
        <div>
          <label className="mb-1 block text-xs text-slate-600">Novo item</label>
          <select
            value={novoItemId}
            onChange={(e) => setNovoItemId(e.target.value)}
            disabled={!novoTipo}
            className="w-full rounded border px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">
              {novoTipo ? "Escolha um item" : "Selecione o tipo primeiro"}
            </option>
            {itensNovo.map((b) => (
              <option key={b.id} value={b.id}>
                {b.item_description}
              </option>
            ))}
            <option value="__OUTRO__">Outro (escrever)</option>
          </select>
          {isOutro && (
            <input
              value={novoItemOutro}
              onChange={(e) => setNovoItemOutro(e.target.value)}
              placeholder="Descreva o novo item"
              className="mt-2 w-full rounded border px-3 py-2 text-sm"
            />
          )}
        </div>

        {/* Valor Remanejado */}
        <div>
          <label className="mb-1 block text-xs text-slate-600">
            Valor a remanejar (R$)
          </label>
          <input
            name="reallocated_value"
            inputMode="decimal"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end justify-end sm:col-span-3">
          <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
            Salvar remanejamento
          </button>
        </div>
      </form>
    </div>
  );
}
