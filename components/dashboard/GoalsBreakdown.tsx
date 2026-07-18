import Link from "next/link";
import { goalStatusLabel, goalStatusTone } from "@/lib/dashboard-helpers";

export type GoalItem = {
  id: string;
  title: string | null;
  status: string | null;
  target_value?: string | null;
  indicator?: string | null;
  project_label?: string | null;
};

const up = (s: string | null | undefined) => String(s ?? "").trim().toUpperCase();

/**
 * Detalha as metas dos projetos: lista cada meta com seu status, indicador e
 * valor-alvo, além de um resumo por status no cabeçalho. Substitui o número
 * solto de "Metas cumpridas" por uma visão de QUAIS metas existem.
 */
export default function GoalsBreakdown({
  goals,
  showProject = true,
  limit = 8,
}: {
  goals: GoalItem[];
  showProject?: boolean;
  limit?: number;
}) {
  const counts = {
    done: goals.filter((g) => up(g.status) === "DONE").length,
    progress: goals.filter((g) => up(g.status) === "IN_PROGRESS").length,
    planned: goals.filter((g) => up(g.status) === "PLANNED" || up(g.status) === "").length,
    blocked: goals.filter((g) => up(g.status) === "BLOCKED").length,
  };

  const shown = goals.slice(0, limit);
  const rest = goals.length - shown.length;

  const chip = (label: string, tone: string) => (
    <span className={`rounded-full border px-2.5 py-1 font-medium ${tone}`}>
      {label}
    </span>
  );

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="flex flex-col gap-3 border-b bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">
            Metas dos projetos
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Veja exatamente quais metas estão concluídas, em andamento ou
            planejadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {chip(
            `${counts.done} concluída${counts.done === 1 ? "" : "s"}`,
            "border-emerald-200 bg-emerald-50 text-emerald-700"
          )}
          {counts.progress > 0 &&
            chip(
              `${counts.progress} em andamento`,
              "border-blue-200 bg-blue-50 text-blue-700"
            )}
          {counts.planned > 0 &&
            chip(
              `${counts.planned} planejada${counts.planned === 1 ? "" : "s"}`,
              "border-slate-200 bg-white text-slate-600"
            )}
          {counts.blocked > 0 &&
            chip(
              `${counts.blocked} bloqueada${counts.blocked === 1 ? "" : "s"}`,
              "border-rose-200 bg-rose-50 text-rose-700"
            )}
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">
          Nenhuma meta cadastrada ainda. Cadastre as metas no plano de cada
          projeto para acompanhá-las aqui.
        </div>
      ) : (
        <ul className="divide-y divide-slate-200">
          {shown.map((g) => {
            const detalhe = [
              showProject && g.project_label ? g.project_label : null,
              g.indicator ? g.indicator : null,
              g.target_value ? `Meta: ${g.target_value}` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={g.id}
                className="flex items-center justify-between gap-4 p-4 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {g.title || "Meta sem título"}
                  </p>
                  {detalhe && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {detalhe}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${goalStatusTone(
                    g.status
                  )}`}
                >
                  {goalStatusLabel(g.status)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {rest > 0 && (
        <div className="border-t px-4 py-3 sm:px-6">
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            +{rest} meta{rest === 1 ? "" : "s"} — ver nos projetos
          </Link>
        </div>
      )}
    </section>
  );
}
