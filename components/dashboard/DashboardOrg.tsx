import Link from "next/link";
import StatCard from "@/components/dashboard/StatCard";
import DashboardOrgMetrics from "@/components/dashboard/DashboardOrgMetrics";
import {
  formatarData,
  projectStatusLabel,
  projectTypeLabel,
} from "@/lib/dashboard-helpers";

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

type Props = {
  nome: string;
  projetos: any[];
  relatorios: any[];
  goalsList?: GoalItem[];
  milestonesList?: MilestoneItem[];
  organizacoes?: Array<{ id: string; name: string }>;
};

export default function DashboardOrg({
  nome,
  projetos,
  relatorios,
  goalsList = [],
  milestonesList = [],
  organizacoes = [],
}: Props) {
  // ── KPIs ──
  const totalProjetos = projetos.length;
  // "Ativo" = projeto efetivamente aprovado. Enviado/em análise ainda não conta.
  const projetosAtivos = projetos.filter((p) => {
    const s = String(p.status ?? "").toUpperCase();
    return s === "APROVADO";
  }).length;

  // Contagens por PROJETO (não relatório)
  const projetosEmCadastro = projetos.filter(
    (p) => String(p.status ?? "").toUpperCase() === "DRAFT"
  ).length;
  const projetosComPendencia = projetos.filter(
    (p) => String(p.status ?? "").toUpperCase() === "DEVOLVIDO"
  ).length;

  const totalRelatorios = relatorios.length;
  const relatoriosDevolvidos = relatorios.filter(
    (r) => String(r.status ?? "").toUpperCase() === "RETURNED"
  ).length;
  const relatoriosRascunho = relatorios.filter(
    (r) => String(r.status ?? "").toUpperCase() === "DRAFT"
  ).length;
  const relatoriosAprovados = relatorios.filter(
    (r) => String(r.status ?? "").toUpperCase() === "APPROVED"
  ).length;

  // ── "Próximo Relatório" — RETURNED primeiro, depois DRAFT, por prazo (period_end) ──
  const prioridadeStatus = (status: string) => {
    const s = status.toUpperCase();
    if (s === "RETURNED") return 0;
    if (s === "DRAFT") return 1;
    return 2;
  };
  const tempoPrazo = (value: unknown) => {
    const t = value ? new Date(String(value)).getTime() : NaN;
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };
  const proximosRelatorios = relatorios
    .filter((r) => {
      const s = String(r.status ?? "").toUpperCase();
      return s === "RETURNED" || s === "DRAFT";
    })
    .slice()
    .sort((a, b) => {
      const byStatus =
        prioridadeStatus(String(a.status ?? "")) -
        prioridadeStatus(String(b.status ?? ""));
      if (byStatus !== 0) return byStatus;
      return tempoPrazo(a.period_end) - tempoPrazo(b.period_end);
    })
    .slice(0, 5);

  // Projetos com vínculo para o filtro de métricas
  const metricsProjects = projetos.map((p) => ({
    id: String(p.id),
    name: String(p.title ?? p.name ?? p.project_name ?? "Projeto sem título"),
    organization_id: p.organization_id ? String(p.organization_id) : null,
  }));

  // ── Painel principal: rascunho (DRAFT) NÃO aparece — só em Projetos ──
  const projetosTop = projetos
    .filter((p) => String(p.status ?? "").toUpperCase() !== "DRAFT")
    .slice(0, 5);

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      {/* ── Header ── */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            Bem-vindo(a), {nome}!
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Painel da organização — gerencie seus projetos e relatórios.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/dashboard/reports"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            📄 Meus relatórios
          </Link>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
          >
            ➕ Novo projeto
          </Link>
        </div>
      </section>

      {/* ── Alerta de devolvidos (topo, antes dos KPIs) ── */}
      {relatoriosDevolvidos > 0 && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <h3 className="text-sm font-semibold text-rose-900">
                {relatoriosDevolvidos} relatório{relatoriosDevolvidos > 1 ? "s" : ""} devolvido{relatoriosDevolvidos > 1 ? "s" : ""} para ajuste
              </h3>
              <p className="mt-1 text-sm text-rose-700">
                O financiador solicitou correções. Revise e reenvie para continuar a prestação de contas.
              </p>
              <Link
                href="/dashboard/reports"
                className="mt-2 inline-flex text-sm font-medium text-rose-800 underline hover:no-underline"
              >
                Ver relatórios devolvidos
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── KPIs — Linha 1 ── */}
      <section className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projetos ativos"
          value={projetosAtivos}
          icon={<span>🗂️</span>}
          tone="blue"
          tag={`${totalProjetos} total`}
        />
        <StatCard
          title="Relatórios enviados"
          value={totalRelatorios - relatoriosRascunho}
          icon={<span>📤</span>}
          tone="green"
          tag={`${relatoriosAprovados} aprovados`}
        />
        <StatCard
          title="Projetos com Pendência"
          value={projetosComPendencia}
          icon={<span>🔄</span>}
          tone="orange"
          tag="requer ação"
        />
        <StatCard
          title="Projetos em Cadastro"
          value={projetosEmCadastro}
          icon={<span>📝</span>}
          tone="red"
          tag="a concluir"
          alert
        />
      </section>

      {/* ── KPIs — Linha 2: Execução & Metas (com filtros) ── */}
      <DashboardOrgMetrics
        projects={metricsProjects}
        organizations={organizacoes}
        goals={goalsList}
        milestones={milestonesList}
      />

      {/* ── Próximo Relatório — priorizado por data de prioridade ── */}
      {proximosRelatorios.length > 0 && (
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b bg-slate-50 px-4 py-4 sm:px-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Próximo Relatório
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Relatórios pendentes em ordem de prioridade — devolvidos primeiro,
              depois por prazo.
            </p>
          </div>

          <ul className="divide-y divide-slate-200">
            {proximosRelatorios.map((r: any) => {
              const isReturned =
                String(r.status ?? "").toUpperCase() === "RETURNED";
              return (
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
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.project_label || "Projeto vinculado"} · Prazo:{" "}
                      {formatarData(r.period_end)}
                    </p>
                  </div>
                  <span
                    className={[
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                      isReturned
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-50 text-slate-600",
                    ].join(" ")}
                  >
                    {isReturned ? "Corrigir" : "Enviar"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Meus projetos ── */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-2 border-b bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Meus projetos
          </h3>
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 sm:px-6">Projeto</th>
                <th className="px-4 py-3 sm:px-6">Tipo</th>
                <th className="px-4 py-3 sm:px-6">Status</th>
                <th className="px-4 py-3 sm:px-6">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {projetosTop.map((p: any) => {
                const label = p.title ?? p.name ?? p.project_name ?? "Projeto sem título";
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-4 font-medium text-slate-900 sm:px-6">
                      <Link
                        href={`/dashboard/projects/${p.id}?tab=overview`}
                        className="hover:underline"
                      >
                        {label}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-600 sm:px-6">
                      {projectTypeLabel(p.project_type)}
                    </td>
                    <td className="px-4 py-4 text-slate-600 sm:px-6">
                      {projectStatusLabel(p.status)}
                    </td>
                    <td className="px-4 py-4 text-slate-600 sm:px-6">
                      {formatarData(p.created_at)}
                    </td>
                  </tr>
                );
              })}
              {projetosTop.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-500 sm:px-6">
                    Nenhum projeto criado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="divide-y divide-slate-200 md:hidden">
          {projetosTop.map((p: any) => {
            const label = p.title ?? p.name ?? p.project_name ?? "Projeto sem título";
            return (
              <div key={p.id} className="space-y-2 p-4">
                <Link
                  href={`/dashboard/projects/${p.id}?tab=overview`}
                  className="block text-sm font-semibold text-slate-900 hover:underline"
                >
                  {label}
                </Link>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{projectTypeLabel(p.project_type)}</span>
                  <span>·</span>
                  <span>{projectStatusLabel(p.status)}</span>
                  <span>·</span>
                  <span>{formatarData(p.created_at)}</span>
                </div>
              </div>
            );
          })}
          {projetosTop.length === 0 && (
            <div className="p-4 text-sm text-slate-500">
              Nenhum projeto criado ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
