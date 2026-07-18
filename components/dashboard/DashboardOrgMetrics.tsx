"use client";

import { useMemo, useState } from "react";

type GoalItem = {
  id: string;
  project_id: string;
  status: string;
  title: string;
};

type MilestoneItem = {
  id: string;
  project_id: string;
  status: string;
  goal_id: string | null;
};

type ProjectItem = {
  id: string;
  name: string;
  organization_id: string | null;
};

type OrgItem = {
  id: string;
  name: string;
};

type Props = {
  projects: ProjectItem[];
  organizations: OrgItem[];
  goals: GoalItem[];
  milestones: MilestoneItem[];
};

const ALL = "__ALL__";

function pct(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300";

export default function DashboardOrgMetrics({
  projects,
  organizations,
  goals,
  milestones,
}: Props) {
  // ── Filtro de Metas Cumpridas: por projeto ──
  const [goalProject, setGoalProject] = useState<string>(ALL);

  const filteredGoals = useMemo(
    () =>
      goalProject === ALL
        ? goals
        : goals.filter((g) => g.project_id === goalProject),
    [goals, goalProject]
  );

  const goalsTotal = filteredGoals.length;
  const goalsDone = filteredGoals.filter(
    (g) => g.status.toUpperCase() === "DONE"
  ).length;
  const pctMetas = pct(goalsDone, goalsTotal);

  // ── Filtro de Execução: por organização / projeto / meta ──
  const [execOrg, setExecOrg] = useState<string>(ALL);
  const [execProject, setExecProject] = useState<string>(ALL);
  const [execGoal, setExecGoal] = useState<string>(ALL);

  // Projetos disponíveis dependem da organização selecionada (cascata)
  const projectsForOrg = useMemo(
    () =>
      execOrg === ALL
        ? projects
        : projects.filter((p) => p.organization_id === execOrg),
    [projects, execOrg]
  );

  const projectIdsForOrg = useMemo(
    () => new Set(projectsForOrg.map((p) => p.id)),
    [projectsForOrg]
  );

  // Metas disponíveis dependem do projeto/organização selecionados (cascata)
  const goalsForContext = useMemo(() => {
    return goals.filter((g) => {
      if (execProject !== ALL) return g.project_id === execProject;
      if (execOrg !== ALL) return projectIdsForOrg.has(g.project_id);
      return true;
    });
  }, [goals, execProject, execOrg, projectIdsForOrg]);

  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      if (execGoal !== ALL && m.goal_id !== execGoal) return false;
      if (execProject !== ALL && m.project_id !== execProject) return false;
      if (execOrg !== ALL && !projectIdsForOrg.has(m.project_id)) return false;
      return true;
    });
  }, [milestones, execGoal, execProject, execOrg, projectIdsForOrg]);

  const milestonesTotal = filteredMilestones.length;
  const milestonesDone = filteredMilestones.filter(
    (m) => m.status.toUpperCase() === "DONE"
  ).length;
  const pctExecucao = pct(milestonesDone, milestonesTotal);

  // Ao trocar organização, reseta projeto/meta; ao trocar projeto, reseta meta.
  function onChangeExecOrg(value: string) {
    setExecOrg(value);
    setExecProject(ALL);
    setExecGoal(ALL);
  }
  function onChangeExecProject(value: string) {
    setExecProject(value);
    setExecGoal(ALL);
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
      {/* ── Execução dos projetos ── */}
      <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">
            Execução dos projetos
          </div>
          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
            📈
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              Organização
            </span>
            <select
              className={selectClass}
              value={execOrg}
              onChange={(e) => onChangeExecOrg(e.target.value)}
            >
              <option value={ALL}>Todas</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Projeto</span>
            <select
              className={selectClass}
              value={execProject}
              onChange={(e) => onChangeExecProject(e.target.value)}
            >
              <option value={ALL}>Todos</option>
              {projectsForOrg.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Meta</span>
            <select
              className={selectClass}
              value={execGoal}
              onChange={(e) => setExecGoal(e.target.value)}
            >
              <option value={ALL}>Todas</option>
              {goalsForContext.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 text-2xl font-bold text-slate-900">
          {pctExecucao}%
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${pctExecucao}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {milestonesDone} de {milestonesTotal} marcos concluídos
        </p>
      </div>

      {/* ── Metas cumpridas ── */}
      <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">
            Metas cumpridas
          </div>
          <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
            🎯
          </span>
        </div>

        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Projeto</span>
            <select
              className={selectClass}
              value={goalProject}
              onChange={(e) => setGoalProject(e.target.value)}
            >
              <option value={ALL}>Todos os projetos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 text-2xl font-bold text-slate-900">
          {goalsDone}
          <span className="text-base font-normal text-slate-500">
            {" "}
            / {goalsTotal}
          </span>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="bg-amber-400 transition-all"
            style={{ width: `${pctMetas}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {pctMetas}% das metas atingidas
        </p>
      </div>
    </section>
  );
}
