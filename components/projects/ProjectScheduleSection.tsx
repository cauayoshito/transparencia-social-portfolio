/**
 * Cronograma de execução mês a mês + contrapartidas pactuadas (INCENTIVADO).
 * Renderizado na aba Plano do projeto. A prestação de contas puxa estas
 * linhas para avaliação por período.
 */

import {
  saveScheduleItemAction,
  deleteScheduleItemAction,
  saveCounterpartAction,
  deleteCounterpartAction,
} from "@/app/actions/project-schedule.actions";
import type {
  ProjectScheduleItem,
  ProjectCounterpart,
} from "@/services/project-schedule.service";

type Props = {
  projectId: string;
  canEdit: boolean;
  scheduleItems: ProjectScheduleItem[];
  counterparts: ProjectCounterpart[];
  /** Contrapartidas só se aplicam a projetos incentivados. */
  showCounterparts: boolean;
  defaultYear?: number;
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function ProjectScheduleSection({
  projectId,
  canEdit,
  scheduleItems,
  counterparts,
  showCounterparts,
  defaultYear,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Cronograma de execução */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            Cronograma de execução
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre as atividades mês a mês. Na prestação de contas, cada
            atividade do período é avaliada (executado plenamente, parcialmente
            ou não executado).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-blue-50 text-xs font-semibold text-slate-700">
                <th className="px-3 py-2">Mês</th>
                <th className="px-3 py-2">Ano</th>
                <th className="px-3 py-2">Atividade</th>
                {canEdit && <th className="w-16 px-3 py-2">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scheduleItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 4 : 3}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    Nenhuma atividade cadastrada no cronograma.
                  </td>
                </tr>
              ) : (
                scheduleItems.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50">
                    <td className="px-3 py-2">{item.activity_month ?? "-"}</td>
                    <td className="px-3 py-2">{item.activity_year ?? "-"}</td>
                    <td className="whitespace-pre-wrap px-3 py-2">
                      {item.activity}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <form action={deleteScheduleItemAction}>
                          <input type="hidden" name="project_id" value={projectId} />
                          <input type="hidden" name="item_id" value={item.id} />
                          <button className="text-xs text-rose-600 hover:underline">
                            Remover
                          </button>
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
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Adicionar atividade ao cronograma
            </h3>
            <form
              action={saveScheduleItemAction}
              className="grid gap-3 sm:grid-cols-6"
            >
              <input type="hidden" name="project_id" value={projectId} />

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-600">Mês</label>
                <select
                  name="activity_month"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
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
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs text-slate-600">
                  Atividade
                </label>
                <input
                  name="activity"
                  required
                  placeholder="Ex: Reuniões com escolas participantes"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end sm:col-span-6">
                <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                  Adicionar atividade
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Contrapartidas pactuadas (INCENTIVADO) */}
      {showCounterparts && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Contrapartidas pactuadas
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Contrapartidas acordadas com o incentivador. Cada relatório de
              prestação de contas avalia a execução de cada contrapartida.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-emerald-50 text-xs font-semibold text-slate-700">
                  <th className="px-3 py-2">Contrapartida</th>
                  <th className="px-3 py-2">Descrição</th>
                  {canEdit && <th className="w-16 px-3 py-2">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {counterparts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 3 : 2}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Nenhuma contrapartida cadastrada.
                    </td>
                  </tr>
                ) : (
                  counterparts.map((c) => (
                    <tr key={c.id} className="align-top hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{c.title}</td>
                      <td className="whitespace-pre-wrap px-3 py-2 text-slate-600">
                        {c.description ?? "-"}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2">
                          <form action={deleteCounterpartAction}>
                            <input type="hidden" name="project_id" value={projectId} />
                            <input
                              type="hidden"
                              name="counterpart_id"
                              value={c.id}
                            />
                            <button className="text-xs text-rose-600 hover:underline">
                              Remover
                            </button>
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
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Adicionar contrapartida
              </h3>
              <form
                action={saveCounterpartAction}
                className="grid gap-3 sm:grid-cols-2"
              >
                <input type="hidden" name="project_id" value={projectId} />

                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Contrapartida
                  </label>
                  <input
                    name="title"
                    required
                    placeholder="Ex: Divulgação da marca nos uniformes"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Descrição
                  </label>
                  <input
                    name="description"
                    placeholder="Detalhe da contrapartida"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end sm:col-span-2">
                  <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Adicionar contrapartida
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
