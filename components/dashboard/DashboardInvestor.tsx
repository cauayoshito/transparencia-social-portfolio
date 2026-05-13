import Link from "next/link";
import StatCard from "@/components/dashboard/StatCard";
import { formatarData, projectStatusLabel, pct } from "@/lib/dashboard-helpers";

type OrgLite = {
  id: string;
  name: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  nome: string;
  projetos: any[];
  relatorios: any[];
  goalsSummary: { total: number; done: number };
  milestonesSummary: { total: number; done: number };
  organizacoes: OrgLite[];
};

export default function DashboardInvestor({
  nome,
  projetos,
  relatorios,
  goalsSummary,
  milestonesSummary,
  organizacoes,
}: Props) {
  // ── Relatórios ──
  const totalRelatorios = relatorios.length;
  const relatoriosAprovados = relatorios.filter(
    (r) => String(r.status ?? "").toUpperCase() === "APPROVED"
  ).length;
  const relatoriosPendentes = relatorios.filter((r) => {
    const s = String(r.status ?? "").toUpperCase();
    return s === "SUBMITTED" || s === "RETURNED";
  }).length;
  const relatoriosSubmetidos = relatorios.filter(
    (r) => String(r.status ?? "").toUpperCase() === "SUBMITTED"
  ).length;
  const relatoriosRascunho = relatorios.filter(
    (r) => String(r.status ?? "").toUpperCase() === "DRAFT"
  ).length;

  // ── Projetos ──
  const totalProjetos = projetos.length;
  const projetosAprovados = projetos.filter(
    (p) => String(p.status ?? "").toUpperCase() === "APROVADO"
  ).length;

  // ── Execução & Metas ──
  const pctExecucao = pct(milestonesSummary.done, milestonesSummary.total);
  const pctMetas = pct(goalsSummary.done, goalsSummary.total);

  // ── Fila de análise ──
  const filaAnalise = relatorios
    .filter((r) => String(r.status ?? "").toUpperCase() === "SUBMITTED")
    .slice(0, 5);

  // ── Projetos recentes ──
  const projetosTop = projetos.slice(0, 5);

  // ── Orgs com contagem de projetos ──
  const orgComProjetos = organizacoes.map((org) => {
    const qtdProjetos = projetos.filter(
      (p: any) => p.organization_id === org.id
    ).length;
    const qtdPendentes = relatorios.filter((r: any) => {
      const proj = projetos.find((p: any) => p.id === r.project_id);
      return (
        proj?.organization_id === org.id &&
        String(r.status ?? "").toUpperCase() === "SUBMITTED"
      );
    }).length;
    return { ...org, qtdProjetos, qtdPendentes };
  });

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      {/* ── Header ── */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            Olá, {nome}!
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Painel do financiador — visão consolidada de projetos, organizações
            e prestação de contas.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {relatoriosSubmetidos > 0 && (
            <Link
              href="/dashboard/reports"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              📄 Avaliar relatórios ({relatoriosSubmetidos})
            </Link>
          )}
        </div>
      </section>

      {/* ── KPIs — Linha 1: Relatórios ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Relatórios
        </p>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Recebidos"
            value={totalRelatorios}
            icon={<span>📥</span>}
            tone="blue"
            tag="total"
          />
          <StatCard
            title="Aprovados"
            value={relatoriosAprovados}
            icon={<span>✅</span>}
            tone="green"
            tag={`${pct(relatoriosAprovados, totalRelatorios)}%`}
          />
          <StatCard
            title="Pendentes"
            value={relatoriosPendentes}
            icon={<span>⏳</span>}
            tone="orange"
            tag="aguardando"
          />
          <StatCard
            title="Projetos ativos"
            value={totalProjetos}
            icon={<span>🗂️</span>}
            tone="blue"
            tag={`${projetosAprovados} aprovados`}
          />
        </div>
      </section>

      {/* ── KPIs — Linha 2: Execução & Metas (Bruno pediu) ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Execução & Metas
        </p>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
          {/* Organizações vinculadas */}
          <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Organizações vinculadas
              </div>
              <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                👥
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {organizacoes.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {organizacoes.length === 1
                ? "organização na carteira"
                : "organizações na carteira"}
            </p>
          </div>

          {/* % Execução (milestones) */}
          <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Execução dos projetos
              </div>
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                📈
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {pctExecucao}%
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${pctExecucao}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {milestonesSummary.done} de {milestonesSummary.total} marcos
              concluídos
            </p>
          </div>

          {/* Metas cumpridas (goals) */}
          <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Metas cumpridas</div>
              <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                🎯
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {goalsSummary.done}
              <span className="text-base font-normal text-slate-500">
                {" "}
                / {goalsSummary.total}
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
        </div>
      </section>

      {/* ── Barra de progresso de relatórios ── */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Distribuição de relatórios
        </h3>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
          {totalRelatorios > 0 && (
            <>
              <div
                className="bg-emerald-500 transition-all"
                style={{
                  width: `${pct(relatoriosAprovados, totalRelatorios)}%`,
                }}
              />
              <div
                className="bg-amber-400 transition-all"
                style={{
                  width: `${pct(relatoriosPendentes, totalRelatorios)}%`,
                }}
              />
              <div
                className="bg-slate-300 transition-all"
                style={{
                  width: `${pct(relatoriosRascunho, totalRelatorios)}%`,
                }}
              />
            </>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Aprovados ({relatoriosAprovados})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
            Pendentes ({relatoriosPendentes})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />
            Rascunho ({relatoriosRascunho})
          </span>
        </div>
      </section>

      {/* ── Organizações vinculadas ── */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-2 border-b bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Organizações vinculadas
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {organizacoes.length} organização
              {organizacoes.length !== 1 ? "ões" : ""} na sua carteira
            </p>
          </div>
          <Link
            href="/dashboard/organizations"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ver todas
          </Link>
        </div>

        {organizacoes.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            Nenhuma organização vinculada ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {orgComProjetos.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between gap-4 p-4 sm:px-6"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/organizations/${org.id}`}
                    className="block truncate text-sm font-semibold text-slate-900 hover:underline"
                  >
                    {org.name || "Organização sem nome"}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>
                      {org.qtdProjetos} projeto
                      {org.qtdProjetos !== 1 ? "s" : ""}
                    </span>
                    {org.qtdPendentes > 0 && (
                      <span className="font-medium text-amber-600">
                        {org.qtdPendentes} relatório
                        {org.qtdPendentes !== 1 ? "s" : ""} pendente
                        {org.qtdPendentes !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/organizations/${org.id}`}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Fila de relatórios aguardando análise ── */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-2 border-b bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Relatórios aguardando sua análise
          </h3>
          <Link
            href="/dashboard/reports"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {filaAnalise.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            Nenhum relatório aguardando análise no momento.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {filaAnalise.map((r: any) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 p-4 sm:px-6"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/reports/${r.id}`}
                    className="block truncate text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {r.title || "Sem título"}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {r.project_label || "Projeto vinculado"} ·{" "}
                    {formatarData(r.created_at)}
                  </p>
                </div>
                <Link
                  href={`/dashboard/reports/${r.id}`}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                >
                  Avaliar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Projetos recentes ── */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-2 border-b bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Projetos recentes
          </h3>
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {projetosTop.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            Nenhum projeto vinculado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {projetosTop.map((p: any) => {
              const label =
                p.title ?? p.name ?? p.project_name ?? "Projeto sem título";
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-4 sm:px-6"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/projects/${p.id}?tab=overview`}
                      className="block truncate text-sm font-semibold text-slate-900 hover:underline"
                    >
                      {label}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatarData(p.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {projectStatusLabel(p.status)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
