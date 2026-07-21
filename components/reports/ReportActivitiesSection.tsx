/**
 * Acompanhamento de atividades do relatório.
 *
 * PUXA os marcos do cronograma do projeto (project_milestones). A organização
 * NÃO redigita as atividades — apenas avalia cada uma: execução (lista
 * suspensa) + avaliação (texto). Espelha o comportamento das Contrapartidas.
 */

import { saveActivityReviewAction } from "@/app/actions/report-activities.actions";

export type MilestoneLite = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
};

export type ActivityReview = {
  milestone_id: string;
  execution: string | null;
  evaluation: string | null;
};

type Props = {
  reportId: string;
  canEdit: boolean;
  milestones: MilestoneLite[];
  reviews: ActivityReview[];
};

const EXECUTION_OPTIONS = [
  "Executado plenamente",
  "Executado parcialmente",
  "Não executado",
];

function periodo(m: MilestoneLite) {
  const fmt = (v: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(d);
  };
  const a = fmt(m.starts_at);
  const b = fmt(m.ends_at);
  if (a && b) return `${a} — ${b}`;
  return a || b || "";
}

export default function ReportActivitiesSection({
  reportId,
  canEdit,
  milestones,
  reviews,
}: Props) {
  const reviewByMilestone = new Map(reviews.map((r) => [r.milestone_id, r]));

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
        Acompanhamento de atividades
      </div>
      <p className="px-4 pt-3 text-xs text-slate-600">
        As atividades vêm do <strong>cronograma do projeto</strong>. Avalie a
        execução de cada uma no período deste relatório.
      </p>

      <div className="space-y-4 p-4">
        {milestones.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhuma atividade no cronograma do projeto. Cadastre os marcos na
            aba <strong>Plano</strong> do projeto.
          </p>
        ) : (
          milestones.map((m) => {
            const review = reviewByMilestone.get(m.id);
            const per = periodo(m);
            return (
              <div key={m.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {m.title}
                  </p>
                  {per && (
                    <span className="text-xs text-slate-500">{per}</span>
                  )}
                </div>
                {m.description && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {m.description}
                  </p>
                )}

                {canEdit ? (
                  <form
                    action={saveActivityReviewAction}
                    className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr_auto]"
                  >
                    <input type="hidden" name="report_id" value={reportId} />
                    <input type="hidden" name="milestone_id" value={m.id} />

                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Execução
                      </label>
                      <select
                        name="execution"
                        defaultValue={review?.execution ?? ""}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Escolha um item</option>
                        {EXECUTION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        Avaliação
                      </label>
                      <input
                        name="evaluation"
                        maxLength={500}
                        defaultValue={review?.evaluation ?? ""}
                        placeholder="Processos, resultados parciais, comentários e observações"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="flex items-end">
                      <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
                        Salvar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">
                      {review?.execution ?? "Não avaliada"}
                    </span>
                    {review?.evaluation && (
                      <span className="text-slate-600"> — {review.evaluation}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
