import {
  addProjectParticipantAction,
  removeProjectParticipantAction,
} from "@/app/actions/project-participants.actions";

type OrgMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

type ProjectParticipant = {
  user_id: string;
  role: "OWNER" | "CONSULTANT" | "INVESTOR" | "VIEWER";
  created_at?: string | null;
  full_name: string | null;
  email: string | null;
};

type Props = {
  projectId: string;
  canManage: boolean;
  organizationMembers: OrgMember[];
  participants: ProjectParticipant[];
};

function participantRoleLabel(value: string) {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();

  if (v === "OWNER") return "Responsável";
  if (v === "CONSULTANT") return "Consultor";
  if (v === "INVESTOR") return "Investidor";
  if (v === "VIEWER") return "Visualizador";

  return v || "Participante";
}

function participantRoleClass(value: string) {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();

  if (v === "OWNER") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (v === "CONSULTANT") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (v === "INVESTOR") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function ProjectParticipants({
  projectId,
  canManage,
  organizationMembers,
  participants,
}: Props) {
  const participantIds = new Set(
    participants.map((participant) => participant.user_id)
  );

  const availableMembers = organizationMembers.filter(
    (member) => !participantIds.has(member.user_id)
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Participantes do projeto
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Defina quem acompanha este projeto e qual papel cada pessoa assume.
          </p>
        </div>
      </div>

      {canManage ? (
        <form
          action={addProjectParticipantAction}
          className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.5fr_1fr_auto]"
        >
          <input type="hidden" name="project_id" value={projectId} />

          <label className="text-sm">
            Membro da organização
            <select
              name="user_id"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Selecione um membro
              </option>

              {availableMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name ?? member.email ?? member.user_id} •{" "}
                  {member.email ?? "Sem e-mail"}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Papel no projeto
            <select
              name="role"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              defaultValue="VIEWER"
              required
            >
              <option value="CONSULTANT">Consultor</option>
              <option value="INVESTOR">Investidor</option>
              <option value="VIEWER">Visualizador</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              disabled={availableMembers.length === 0}
            >
              Adicionar participante
            </button>
          </div>

          {availableMembers.length === 0 ? (
            <div className="text-sm text-slate-500 md:col-span-3">
              Todos os membros disponíveis da organização já foram adicionados
              a este projeto.
            </div>
          ) : null}
        </form>
      ) : null}

      <div className="mt-5 space-y-3">
        {participants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Nenhum participante foi adicionado a este projeto.
          </div>
        ) : (
          participants.map((participant) => (
            <div
              key={participant.user_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-medium text-slate-900">
                  {participant.full_name ?? "Usuário sem nome"}
                </div>
                <div className="break-all text-xs text-slate-500">
                  {participant.email ?? participant.user_id}
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${participantRoleClass(
                    participant.role
                  )}`}
                >
                  {participantRoleLabel(participant.role)}
                </span>

                {canManage && participant.role !== "OWNER" ? (
                  <form action={removeProjectParticipantAction}>
                    <input type="hidden" name="project_id" value={projectId} />
                    <input
                      type="hidden"
                      name="user_id"
                      value={participant.user_id}
                    />

                    <button className="text-sm font-medium text-rose-600 hover:underline">
                      Remover
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
