/**
 * Acompanhamento de atividades do relatório (modelo PHI).
 * Renderizada no INÍCIO da página de edição do relatório.
 *
 * Colunas: Mês, Ano, Atividade, Execução, Avaliação (máx. 500 caracteres).
 */

import {
  saveReportActivityAction,
  deleteReportActivityAction,
} from "@/app/actions/report-activities.actions";
import type { ReportActivity } from "@/services/report-activities.service";

type Props = {
  reportId: string;
  canEdit: boolean;
  activities: ReportActivity[];
  defaultYear?: number;
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const EXECUTION_OPTIONS = [
  "Realizada",
  "Parcialmente realizada",
  "Não realizada",
  "Em andamento",
];

export default function ReportActivitiesSection({
  reportId,
  canEdit,
  activities,
  defaultYear,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
        Acompanhamento de atividades
      </div>
      <p className="px-4 pt-3 text-xs text-slate-600">
        Registre as atividades do período, a execução de cada uma e a avaliação
        de processos, resultados parciais, comentários e observações.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-blue-50 text-xs font-semibold text-slate-700">
              <th className="px-3 py-2">Mês</th>
              <th className="px-3 py-2">Ano</th>
              <th className="px-3 py-2">Atividade</th>
              <th className="px-3 py-2">Execução</th>
              <th className="px-3 py-2">Avaliação</th>
              {canEdit && <th className="w-16 px-3 py-2">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activities.map((a) => (
              <tr key={a.id} className="align-top hover:bg-slate-50">
                <td className="px-3 py-2">{a.activity_month ?? "-"}</td>
                <td className="px-3 py-2">{a.activity_year ?? "-"}</td>
                <td className="max-w-[240px] whitespace-pre-wrap px-3 py-2">
                  {a.activity}
                </td>
                <td className="px-3 py-2">{a.execution ?? "-"}</td>
                <td className="max-w-[260px] whitespace-pre-wrap px-3 py-2 text-slate-600">
                  {a.evaluation ?? "-"}
                </td>
                {canEdit && (
                  <td className="px-3 py-2">
                    <form action={deleteReportActivityAction}>
                      <input type="hidden" name="report_id" value={reportId} />
                      <input type="hidden" name="activity_id" value={a.id} />
                      <button className="text-rose-600 hover:underline">
                        Excluir
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {activities.length === 0 && (
              <tr>
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  Nenhuma atividade cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-700">
            Adicionar atividade
          </h4>
          <form
            action={saveReportActivityAction}
            className="grid gap-3 sm:grid-cols-6"
          >
            <input type="hidden" name="report_id" value={reportId} />

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-600">Mês</label>
              <select
                name="activity_month"
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-600">Ano</label>
              <input
                name="activity_year"
                type="number"
                min={2000}
                max={2100}
                defaultValue={defaultYear ?? ""}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs text-slate-600">
                Execução
              </label>
              <select
                name="execution"
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Escolha um item</option>
                {EXECUTION_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="mb-1 block text-xs text-slate-600">
                Atividade
              </label>
              <textarea
                name="activity"
                required
                rows={2}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="mb-1 block text-xs text-slate-600">
                Avaliação de processos, resultados parciais, comentários e
                observações
              </label>
              <textarea
                name="evaluation"
                rows={3}
                maxLength={500}
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Máximo 500 caracteres.
              </p>
            </div>

            <div className="flex justify-end sm:col-span-6">
              <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
                Salvar Avaliação
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
