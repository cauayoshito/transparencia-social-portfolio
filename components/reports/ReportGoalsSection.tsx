/**
 * Indicadores e metas do relatório.
 *
 * PUXA as metas do projeto (project_goals). Por meta, a organização lança
 * MANUALMENTE apenas o "Realizado no período"; o "Realizado acumulado" e a
 * "% da execução" são calculados. Cada meta tem um campo de avaliação.
 * Renderizada logo abaixo do "Acompanhamento de atividades".
 */

import { saveGoalProgressAction } from "@/app/actions/report-activities.actions";

export type GoalLite = {
  id: string;
  title: string;
  indicator: string | null;
  target_value: string | null;
};

export type GoalProgress = {
  goal_id: string;
  realized_period: number;
  evaluation: string | null;
};

type Props = {
  reportId: string;
  canEdit: boolean;
  goals: GoalLite[];
  /** Progresso lançado neste relatório. */
  progress: GoalProgress[];
  /** Acumulado (todos os relatórios) por meta. */
  accumulatedByGoal: Record<string, number>;
};

function parseTarget(v: string | null): number | null {
  if (!v) return null;
  const m = String(v).replace(/\./g, "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
}

export default function ReportGoalsSection({
  reportId,
  canEdit,
  goals,
  progress,
  accumulatedByGoal,
}: Props) {
  const progByGoal = new Map(progress.map((p) => [p.goal_id, p]));

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
        Indicadores e metas
      </div>
      <p className="px-4 pt-3 text-xs text-slate-600">
        As metas vêm do <strong>projeto</strong>. Lance o{" "}
        <strong>realizado no período</strong> de cada uma — o acumulado e a %
        são calculados automaticamente.
      </p>

      <div className="space-y-4 p-4">
        {goals.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhuma meta cadastrada no projeto. Cadastre em{" "}
            <strong>Plano → Metas do projeto</strong>.
          </p>
        ) : (
          goals.map((g) => {
            const p = progByGoal.get(g.id);
            const alvo = parseTarget(g.target_value);
            const acumulado = accumulatedByGoal[g.id] ?? 0;
            const pct =
              alvo && alvo > 0 ? Math.round((acumulado / alvo) * 1000) / 10 : null;
            return (
              <div key={g.id} className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{g.title}</p>
                <div className="mt-1 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                  <span>
                    <span className="font-medium">Indicador:</span>{" "}
                    {g.indicator || "—"}
                  </span>
                  <span>
                    <span className="font-medium">Meta (quantitativo):</span>{" "}
                    {g.target_value || "—"}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {canEdit ? (
                    <form
                      action={saveGoalProgressAction}
                      className="contents"
                    >
                      <input type="hidden" name="report_id" value={reportId} />
                      <input type="hidden" name="goal_id" value={g.id} />

                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Realizado no período
                        </label>
                        <input
                          name="realized_period"
                          inputMode="decimal"
                          defaultValue={
                            p?.realized_period
                              ? fmtNum(Number(p.realized_period))
                              : ""
                          }
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          Realizado acumulado
                        </label>
                        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {fmtNum(acumulado)}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-slate-600">
                          % da execução
                        </label>
                        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                          {pct == null ? "—" : `${fmtNum(pct)}%`}
                        </div>
                      </div>

                      <div className="flex items-end">
                        <button className="w-full rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
                          Salvar
                        </button>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="mb-1 block text-xs text-slate-600">
                          Avaliação da meta
                        </label>
                        <input
                          name="evaluation"
                          defaultValue={p?.evaluation ?? ""}
                          placeholder="Comentários e observações sobre a meta"
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>
                    </form>
                  ) : (
                    <div className="sm:col-span-4 text-sm text-slate-700">
                      Realizado no período:{" "}
                      <b>{fmtNum(Number(p?.realized_period ?? 0))}</b> · Acumulado:{" "}
                      <b>{fmtNum(acumulado)}</b>
                      {pct != null && (
                        <>
                          {" "}
                          · Execução: <b>{fmtNum(pct)}%</b>
                        </>
                      )}
                      {p?.evaluation && (
                        <div className="mt-1 text-slate-600">{p.evaluation}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
