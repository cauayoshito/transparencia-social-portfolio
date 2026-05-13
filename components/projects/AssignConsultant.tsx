import {
  assignConsultantToProjectAction,
  removeConsultantFromProjectAction,
} from "@/app/actions/project-participants.actions";

type ConsultantCandidate = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type AssignedConsultant = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type Props = {
  projectId: string;
  availableConsultants: ConsultantCandidate[];
  assignedConsultants: AssignedConsultant[];
};

export default function AssignConsultant({
  projectId,
  availableConsultants,
  assignedConsultants,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Consultor do projeto
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Atribua um consultor para acompanhar e analisar este projeto.
        </p>
      </div>

      {/* Consultores já atribuídos */}
      {assignedConsultants.length > 0 && (
        <div className="mt-4 space-y-2">
          {assignedConsultants.map((consultant) => (
            <div
              key={consultant.user_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-medium text-slate-900">
                  {consultant.full_name ?? "Consultor sem nome"}
                </div>
                <div className="break-all text-xs text-slate-500">
                  {consultant.email ?? consultant.user_id}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Consultor
                </span>

                <form action={removeConsultantFromProjectAction}>
                  <input type="hidden" name="project_id" value={projectId} />
                  <input
                    type="hidden"
                    name="consultant_user_id"
                    value={consultant.user_id}
                  />
                  <button className="text-sm font-medium text-rose-600 hover:underline">
                    Remover
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignedConsultants.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          Nenhum consultor foi atribuído a este projeto. Atribua um consultor
          abaixo para iniciar o acompanhamento.
        </div>
      )}

      {/* Formulário para atribuir novo consultor */}
      {availableConsultants.length > 0 ? (
        <form
          action={assignConsultantToProjectAction}
          className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.5fr_auto]"
        >
          <input type="hidden" name="project_id" value={projectId} />

          <label className="text-sm">
            Consultor disponível
            <select
              name="consultant_user_id"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Selecione um consultor
              </option>
              {availableConsultants.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.full_name ?? c.email ?? c.user_id} •{" "}
                  {c.email ?? "Sem e-mail"}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Atribuir consultor
            </button>
          </div>
        </form>
      ) : assignedConsultants.length > 0 ? (
        <div className="mt-4 text-sm text-slate-500">
          Todos os consultores disponíveis já foram atribuídos.
        </div>
      ) : null}
    </section>
  );
}
