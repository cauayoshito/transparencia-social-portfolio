/**
 * Avaliação das contrapartidas pactuadas no relatório (projetos INCENTIVADO).
 * Puxa as contrapartidas cadastradas no projeto; cada uma recebe execução
 * (Executado plenamente / parcialmente / Não executado) e comentário.
 * Fotos de evidência vão no Registro fotográfico do relatório.
 */

import { saveCounterpartReviewAction } from "@/app/actions/report-activities.actions";
import type { ProjectCounterpart } from "@/services/project-schedule.service";

export type CounterpartReview = {
  counterpart_id: string;
  execution: string | null;
  comment: string | null;
};

type Props = {
  reportId: string;
  canEdit: boolean;
  counterparts: ProjectCounterpart[];
  reviews: CounterpartReview[];
};

const EXECUTION_OPTIONS = [
  "Executado plenamente",
  "Executado parcialmente",
  "Não executado",
];

export default function ReportCounterpartsSection({
  reportId,
  canEdit,
  counterparts,
  reviews,
}: Props) {
  const reviewByCounterpart = new Map(
    reviews.map((r) => [r.counterpart_id, r]),
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white">
        Contrapartidas
      </div>
      <p className="px-4 pt-3 text-xs text-slate-600">
        Avalie a execução de cada contrapartida pactuada no projeto. Fotos de
        evidência podem ser enviadas no Registro fotográfico.
      </p>

      <div className="space-y-4 p-4">
        {counterparts.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Nenhuma contrapartida pactuada no projeto. Cadastre na aba Plano do
            projeto.
          </p>
        ) : (
          counterparts.map((c) => {
            const review = reviewByCounterpart.get(c.id);
            return (
              <div
                key={c.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {c.title}
                </p>
                {c.description && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {c.description}
                  </p>
                )}

                {canEdit ? (
                  <form
                    action={saveCounterpartReviewAction}
                    className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr_auto]"
                  >
                    <input type="hidden" name="report_id" value={reportId} />
                    <input type="hidden" name="counterpart_id" value={c.id} />

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
                        Comentário
                      </label>
                      <input
                        name="comment"
                        defaultValue={review?.comment ?? ""}
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
                    {review?.comment && (
                      <span className="text-slate-600"> — {review.comment}</span>
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
