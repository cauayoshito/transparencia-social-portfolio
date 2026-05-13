import Link from "next/link";
import StatCard from "@/components/dashboard/StatCard";
import {
  formatarData,
  reportStatusLabel,
  projectStatusLabel,
  pct,
} from "@/lib/dashboard-helpers";

type Props = {
  nome: string;
  projetos: any[];
  relatorios: any[];
};

export default function DashboardConsultor({
  nome,
  projetos,
  relatorios,
}: Props) {
  // ── KPIs ──
  const totalProjetos = projetos.length;

  const totalRelatorios = relatorios.length;
  const aguardandoRevisao = relatorios.filter(
    (r) => String(r.status ?? "").toUpperCase() === "SUBMITTED"
  ).length;
  const jaRevisados = relatorios.filter((r) => {
    const s = String(r.status ?? "").toUpperCase();
    return s === "APPROVED" || s === "RETURNED";
  }).length;

  // ── Fila de revisão ──
  const filaRevisao = relatorios
    .filter((r) => String(r.status ?? "").toUpperCase() === "SUBMITTED")
    .slice(0, 6);

  // ── Projetos sob gestão ──
  const projetosTop = projetos.slice(0, 5);

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      {/* ── Header ── */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            Olá, {nome}!
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Painel do consultor — acompanhe e revise relatórios dos projetos sob
            sua gestão.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/dashboard/reports"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 sm:w-auto"
          >
            📋 Fila de revisão
          </Link>
        </div>
      </section>

      {/* ── KPIs ── */}
      <section className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projetos sob gestão"
          value={totalProjetos}
          icon={<span>🗂️</span>}
          tone="blue"
          tag="ativos"
        />
        <StatCard
          title="Aguardando revisão"
          value={aguardandoRevisao}
          icon={<span>⏳</span>}
          tone="orange"
          tag="na fila"
        />
        <StatCard
          title="Já revisados"
          value={jaRevisados}
          icon={<span>✅</span>}
          tone="green"
          tag={`de ${totalRelatorios}`}
        />
        <StatCard
          title="Taxa de revisão"
          value={`${pct(jaRevisados, totalRelatorios)}%`}
          icon={<span>📊</span>}
          tone="blue"
          tag="concluído"
        />
      </section>

      {/* ── Alerta de fila ── */}
      {aguardandoRevisao > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">📋</span>
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                {aguardandoRevisao} relatório{aguardandoRevisao > 1 ? "s" : ""} aguardando sua revisão
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                Relatórios submetidos pelas organizações que precisam do seu parecer.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Fila de revisão ── */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-2 border-b bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Relatórios para revisar
          </h3>
          <Link
            href="/dashboard/reports"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {filaRevisao.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">
            Nenhum relatório na fila de revisão.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {filaRevisao.map((r: any) => (
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
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Revisar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Projetos sob gestão ── */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-col gap-2 border-b bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Projetos sob minha gestão
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
            Nenhum projeto vinculado à sua conta de consultor.
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
