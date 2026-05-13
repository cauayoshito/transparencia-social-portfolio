import {
  createProjectGoalAction,
  deleteProjectGoalAction,
  updateProjectGoalAction,
} from "@/app/actions/project-goals.actions";
import {
  createProjectMilestoneAction,
  deleteProjectMilestoneAction,
  updateProjectMilestoneAction,
} from "@/app/actions/project-milestones.actions";
import { saveProjectPlanAction } from "@/app/actions/project-plan.actions";
import { normalizeProjectPlanData } from "@/lib/project-plan";
import {
  listProjectGoals,
  type ProjectGoalRow,
} from "@/services/project-goals.service";
import {
  listProjectMilestones,
  type ProjectMilestoneRow,
} from "@/services/project-milestones.service";

type ProjectLike = {
  id: string;
  project_type?: string | null;
  plan_data?: unknown;
};

const GOAL_STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planejada" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "DONE", label: "Concluida" },
  { value: "BLOCKED", label: "Bloqueada" },
] as const;

const MILESTONE_STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planejado" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "DONE", label: "Concluido" },
  { value: "DELAYED", label: "Atrasado" },
] as const;

function projectTypeLabel(value?: string | null) {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();

  if (v === "INCENTIVADO") return "Incentivos Fiscais";
  if (v === "RECURSOS_PUBLICOS") return "Recursos Publicos";
  if (v === "RECURSOS_PROPRIOS") return "Recursos Proprios";

  return value ?? "-";
}

function goalStatusLabel(value: string | null | undefined) {
  return (
    GOAL_STATUS_OPTIONS.find((option) => option.value === value)?.label ??
    "Planejada"
  );
}

function milestoneStatusLabel(value: string | null | undefined) {
  return (
    MILESTONE_STATUS_OPTIONS.find((option) => option.value === value)?.label ??
    "Planejado"
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function formatDueDate(value: string | null | undefined) {
  return formatDate(value) ?? "Prazo nao definido";
}

function formatMilestonePeriod(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
) {
  const startsLabel = formatDate(startsAt);
  const endsLabel = formatDate(endsAt);

  if (startsLabel && endsLabel) return `De ${startsLabel} ate ${endsLabel}`;
  if (startsLabel) return `Inicio em ${startsLabel}`;
  if (endsLabel) return `Fim em ${endsLabel}`;

  return "Periodo nao definido";
}

function getNextSortOrder(
  items: Array<{ sort_order: number | null | undefined }>
) {
  if (items.length === 0) return 0;

  return (
    items.reduce(
      (highest, item) => Math.max(highest, Number(item.sort_order ?? 0)),
      -1
    ) + 1
  );
}

export default async function ProjectPlan({
  project,
}: {
  project: ProjectLike;
}) {
  const plan = normalizeProjectPlanData(project.plan_data);

  const [goalsResult, milestonesResult] = await Promise.allSettled([
    listProjectGoals(project.id),
    listProjectMilestones(project.id),
  ]);

  const goals =
    goalsResult.status === "fulfilled"
      ? goalsResult.value
      : ([] as ProjectGoalRow[]);

  const milestones =
    milestonesResult.status === "fulfilled"
      ? milestonesResult.value
      : ([] as ProjectMilestoneRow[]);

  const goalsLoadError =
    goalsResult.status === "rejected"
      ? "Nao foi possivel carregar as metas deste projeto agora."
      : null;

  const milestonesLoadError =
    milestonesResult.status === "rejected"
      ? "Nao foi possivel carregar o cronograma deste projeto agora."
      : null;

  const goalTitleById = new Map(goals.map((goal) => [goal.id, goal.title]));
  const suggestedGoalSortOrder = getNextSortOrder(goals);
  const suggestedMilestoneSortOrder = getNextSortOrder(milestones);

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Plano do projeto
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Registre o objetivo geral que orienta esta fase do projeto.
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Tipo do projeto:{" "}
          <span className="font-semibold text-slate-900">
            {projectTypeLabel(project.project_type)}
          </span>
        </div>

        <form action={saveProjectPlanAction} className="space-y-4">
          <input type="hidden" name="project_id" value={project.id} />

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Objetivo geral
            </label>
            <textarea
              name="objective"
              defaultValue={plan.objective_general}
              className="min-h-[160px] w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-300"
              placeholder="Descreva com clareza o objetivo principal do projeto."
            />
            <p className="mt-2 text-xs text-slate-500">
              Use este campo para registrar a direcao central do projeto nesta
              fase.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
            >
              Salvar plano
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h3 className="text-base font-semibold text-slate-900">
            Metas do projeto
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre as metas que orientam a execucao e o acompanhamento deste
            projeto.
          </p>
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          {goalsLoadError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {goalsLoadError}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900">
                Nova meta
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                Defina o resultado esperado, como ele sera medido e qual o prazo
                de referencia.
              </p>
            </div>

            <form action={createProjectGoalAction} className="space-y-4">
              <input type="hidden" name="project_id" value={project.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Titulo
                  </label>
                  <input
                    name="title"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                    placeholder="Ex: Ampliar o alcance do projeto em 20%"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue="PLANNED"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                  >
                    {GOAL_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Prazo
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Indicador
                  </label>
                  <input
                    name="indicator"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                    placeholder="Ex: numero de beneficiarios"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Valor alvo
                  </label>
                  <input
                    name="target_value"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                    placeholder="Ex: 500 participantes"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Ordenacao
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="sort_order"
                    defaultValue={suggestedGoalSortOrder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Descricao
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                    placeholder="Explique o contexto da meta e o resultado esperado."
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
                >
                  Adicionar meta
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Metas cadastradas
              </h4>
              <span className="text-sm text-slate-500">
                {goals.length} {goals.length === 1 ? "meta" : "metas"}
              </span>
            </div>

            {goals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                Nenhuma meta cadastrada ainda. Use o formulario acima para
                registrar a primeira meta deste projeto.
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <article
                    key={goal.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h5 className="break-words text-sm font-semibold text-slate-900">
                          {goal.title}
                        </h5>
                        <p className="mt-1 text-sm text-slate-500">
                          Prazo: {formatDueDate(goal.due_date)}
                        </p>
                      </div>

                      <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {goalStatusLabel(goal.status)}
                      </span>
                    </div>

                    <form
                      action={updateProjectGoalAction}
                      className="space-y-4"
                    >
                      <input
                        type="hidden"
                        name="project_id"
                        value={project.id}
                      />
                      <input type="hidden" name="goal_id" value={goal.id} />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-slate-900">
                            Titulo
                          </label>
                          <input
                            name="title"
                            required
                            defaultValue={goal.title}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-900">
                            Status
                          </label>
                          <select
                            name="status"
                            defaultValue={goal.status}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                          >
                            {GOAL_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-900">
                            Prazo
                          </label>
                          <input
                            type="date"
                            name="due_date"
                            defaultValue={goal.due_date ?? ""}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-900">
                            Indicador
                          </label>
                          <input
                            name="indicator"
                            defaultValue={goal.indicator ?? ""}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-900">
                            Valor alvo
                          </label>
                          <input
                            name="target_value"
                            defaultValue={goal.target_value ?? ""}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-900">
                            Ordenacao
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            name="sort_order"
                            defaultValue={goal.sort_order}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-slate-900">
                            Descricao
                          </label>
                          <textarea
                            name="description"
                            rows={4}
                            defaultValue={goal.description ?? ""}
                            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
                        >
                          Salvar alteracoes
                        </button>
                      </div>
                    </form>

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <form action={deleteProjectGoalAction}>
                        <input
                          type="hidden"
                          name="project_id"
                          value={project.id}
                        />
                        <input type="hidden" name="goal_id" value={goal.id} />
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 sm:w-auto"
                        >
                          Remover meta
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h3 className="text-base font-semibold text-slate-900">
            Cronograma do projeto
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Organize os principais marcos de execucao, com periodo, status e
            vinculo opcional com as metas cadastradas.
          </p>
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          {milestonesLoadError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {milestonesLoadError}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900">
                Novo marco
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                Cadastre uma etapa relevante do projeto. O vinculo com meta e
                opcional.
              </p>
            </div>

            {goals.length === 0 && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
                Este projeto ainda nao tem metas cadastradas. Voce pode criar o
                marco sem vinculo por enquanto.
              </div>
            )}

            <form action={createProjectMilestoneAction} className="space-y-4">
              <input type="hidden" name="project_id" value={project.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Titulo
                  </label>
                  <input
                    name="title"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                    placeholder="Ex: Iniciar mobilizacao do publico"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Meta vinculada
                  </label>
                  <select
                    name="goal_id"
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                  >
                    <option value="">Sem vinculo com meta</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue="PLANNED"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                  >
                    {MILESTONE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Data de inicio
                  </label>
                  <input
                    type="date"
                    name="starts_at"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Data de fim
                  </label>
                  <input
                    type="date"
                    name="ends_at"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Ordenacao
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="sort_order"
                    defaultValue={suggestedMilestoneSortOrder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Descricao
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                    placeholder="Explique o objetivo e a entrega esperada deste marco."
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
                >
                  Adicionar marco
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Marcos cadastrados
              </h4>
              <span className="text-sm text-slate-500">
                {milestones.length}{" "}
                {milestones.length === 1 ? "marco" : "marcos"}
              </span>
            </div>

            {milestones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                Nenhum marco cadastrado ainda. Use o formulario acima para
                montar o cronograma real deste projeto.
              </div>
            ) : (
              <div className="space-y-4">
                {milestones.map((milestone) => {
                  const linkedGoalTitle = milestone.goal_id
                    ? goalTitleById.get(milestone.goal_id) ??
                      "Meta indisponivel"
                    : null;

                  return (
                    <article
                      key={milestone.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <h5 className="break-words text-sm font-semibold text-slate-900">
                            {milestone.title}
                          </h5>
                          <p className="text-sm text-slate-500">
                            {formatMilestonePeriod(
                              milestone.starts_at,
                              milestone.ends_at
                            )}
                          </p>
                          <p className="text-sm text-slate-500">
                            {linkedGoalTitle
                              ? `Meta vinculada: ${linkedGoalTitle}`
                              : "Sem meta vinculada"}
                          </p>
                        </div>

                        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {milestoneStatusLabel(milestone.status)}
                        </span>
                      </div>

                      <form
                        action={updateProjectMilestoneAction}
                        className="space-y-4"
                      >
                        <input
                          type="hidden"
                          name="project_id"
                          value={project.id}
                        />
                        <input
                          type="hidden"
                          name="milestone_id"
                          value={milestone.id}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-900">
                              Titulo
                            </label>
                            <input
                              name="title"
                              required
                              defaultValue={milestone.title}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900">
                              Meta vinculada
                            </label>
                            <select
                              name="goal_id"
                              defaultValue={milestone.goal_id ?? ""}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                            >
                              <option value="">Sem vinculo com meta</option>
                              {goals.map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                  {goal.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900">
                              Status
                            </label>
                            <select
                              name="status"
                              defaultValue={milestone.status}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                            >
                              {MILESTONE_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900">
                              Data de inicio
                            </label>
                            <input
                              type="date"
                              name="starts_at"
                              defaultValue={milestone.starts_at ?? ""}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900">
                              Data de fim
                            </label>
                            <input
                              type="date"
                              name="ends_at"
                              defaultValue={milestone.ends_at ?? ""}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-900">
                              Ordenacao
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              name="sort_order"
                              defaultValue={milestone.sort_order}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-900">
                              Descricao
                            </label>
                            <textarea
                              name="description"
                              rows={4}
                              defaultValue={milestone.description ?? ""}
                              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
                          >
                            Salvar alteracoes
                          </button>
                        </div>
                      </form>

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <form action={deleteProjectMilestoneAction}>
                          <input
                            type="hidden"
                            name="project_id"
                            value={project.id}
                          />
                          <input
                            type="hidden"
                            name="milestone_id"
                            value={milestone.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 sm:w-auto"
                          >
                            Remover marco
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
