import { submitProjectParecerAction } from "@/app/actions/project-parecer.actions";

type Props = {
  projectId: string;
};

export default function ProjectParecer({ projectId }: Props) {
  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Parecer do consultor
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Registre sua avaliação do projeto. Ao enviar, um relatório pendente é
            gerado para a organização social acompanhar a decisão.
          </p>
        </div>

        <form action={submitProjectParecerAction} className="space-y-4">
          <input type="hidden" name="project_id" value={projectId} />

          <div>
            <label
              htmlFor="parecer-observacao"
              className="mb-2 block text-sm font-medium text-slate-900"
            >
              Observação
            </label>
            <textarea
              id="parecer-observacao"
              name="observacao"
              rows={5}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-slate-300"
              placeholder="Descreva os motivos do parecer, pontos de atenção e orientações para a organização."
            />
            <p className="mt-2 text-xs text-slate-500">
              Selecione abaixo a decisão. A observação é enviada junto ao parecer.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="submit"
              name="decision"
              value="APROVADO"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Aprovado
            </button>

            <button
              type="submit"
              name="decision"
              value="REPROVADO"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
            >
              Reprovado
            </button>

            <button
              type="submit"
              name="decision"
              value="AJUSTE"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
            >
              Solicitar Ajuste
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
