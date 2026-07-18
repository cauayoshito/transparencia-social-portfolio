import Link from "next/link";
import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole } from "@/lib/roles";
import {
  listProjectsForUserReports,
  listReportsForUser,
} from "@/services/reports.service";
import {
  createReportAction,
  duplicateReportAction,
  deleteReportAction,
} from "@/app/actions/report.actions";
import ConfirmDeleteButton from "./ConfirmDeleteButton";
import { REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function fallbackTitle(
  title: string | null,
  periodStart: string,
  periodEnd: string
) {
  if (title && title.trim()) return title;
  return `Relatório ${formatDate(periodStart)} → ${formatDate(periodEnd)}`;
}

function toIsoDateLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthDefaults() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { start: toIsoDateLocal(firstDay), end: toIsoDateLocal(lastDay) };
}

function badgeClass(status: string) {
  const s = status.toUpperCase();
  if (s === "DRAFT") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "SUBMITTED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "RETURNED") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

async function doDuplicate(reportId: string) {
  "use server";
  await duplicateReportAction(reportId);
}

async function doDelete(reportId: string) {
  "use server";
  await deleteReportAction(reportId);
}

type PageProps = {
  searchParams?: { status?: string };
};

const STATUS_FILTERS = [
  { key: "ALL", label: "Todos" },
  { key: "DRAFT", label: "Rascunho" },
  { key: "SUBMITTED", label: "Enviados" },
  { key: "RETURNED", label: "Devolvidos" },
  { key: "APPROVED", label: "Aprovados" },
] as const;

export default async function DashboardReportsPage({ searchParams }: PageProps) {
  const user = await requireUser();

  // Resolver perfil
  let role: ReturnType<typeof getPrimaryRole> = "ORG";
  try {
    const ctx = await getUserContext(user.id);
    role = getPrimaryRole(ctx);
  } catch {
    // fallback ORG
  }

  const [projects, reports] = await Promise.all([
    listProjectsForUserReports(user.id),
    listReportsForUser(user.id),
  ]);

  const defaults = getCurrentMonthDefaults();

  // Títulos e descrições por perfil
  const pageTitle =
    role === "INVESTOR"
      ? "Relatórios recebidos"
      : role === "CONSULTANT"
      ? "Relatórios para revisão"
      : "Relatórios";

  const pageDescription =
    role === "INVESTOR"
      ? "Relatórios submetidos pelas organizações vinculadas. Avalie e aprove."
      : role === "CONSULTANT"
      ? "Relatórios dos projetos sob sua gestão. Revise e emita pareceres."
      : "Acompanhe os relatórios vinculados aos projetos da sua organização.";

  // Ações por perfil
  // Relatórios (prestação de contas) são criados pela ORG; o financiador também
  // pode criar (mesmo critério da createReportAction). Consultor não cria.
  const canCreate = role === "ORG" || role === "INVESTOR";
  const canDuplicate = role === "ORG" || role === "INVESTOR";
  const canDelete = role === "ORG" || role === "INVESTOR";

  // ── Filtro de status (navegação por querystring) ──
  const activeStatus = String(searchParams?.status ?? "ALL").toUpperCase();
  const allReports = reports ?? [];
  const statusCounts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f.key] =
      f.key === "ALL"
        ? allReports.length
        : allReports.filter(
            (r: any) => String(r.status ?? "").toUpperCase() === f.key
          ).length;
    return acc;
  }, {} as Record<string, number>);

  const visibleReports =
    activeStatus === "ALL"
      ? allReports
      : allReports.filter(
          (r: any) => String(r.status ?? "").toUpperCase() === activeStatus
        );

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
          <p className="text-sm text-slate-600">{pageDescription}</p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          Voltar
        </Link>
      </header>

      {/* ── Formulário de criação — SOMENTE ORG ── */}
      {canCreate && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">Criar relatório</h2>
            <p className="mt-1 text-sm text-slate-600">
              Selecione o projeto e o período para iniciar um novo relatório.
            </p>
          </div>

          <form action={createReportAction} className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Projeto
              </label>
              <select
                name="project_id"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                required
              >
                <option value="">Selecione...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Título (opcional)
              </label>
              <input
                name="title"
                placeholder="Ex: Relatório Mensal"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Tipo
              </label>
              <select
                name="period_type"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                defaultValue="MONTHLY"
              >
                <option value="MONTHLY">Mensal</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Início
              </label>
              <input
                name="period_start"
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                defaultValue={defaults.start}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Fim
              </label>
              <input
                name="period_end"
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                defaultValue={defaults.end}
                required
              />
            </div>

            <div className="sm:col-span-6">
              <button
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                type="submit"
              >
                Criar relatório
              </button>
            </div>
          </form>

          {projects.length === 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Você não tem projetos visíveis para criar relatórios no momento.
            </div>
          )}
        </section>
      )}

      {/* ── Tabela de relatórios ── */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="font-semibold text-slate-900">
            {canCreate ? "Relatórios criados" : "Lista de relatórios"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {canCreate
              ? "Acompanhe, duplique ou exclua relatórios existentes."
              : "Clique em Abrir para visualizar ou avaliar o relatório."}
          </p>

          {/* Filtro de status */}
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => {
              const isActive = activeStatus === f.key;
              const href =
                f.key === "ALL"
                  ? "/dashboard/reports"
                  : `/dashboard/reports?status=${f.key}`;
              return (
                <Link
                  key={f.key}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {statusCounts[f.key] ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Relatório
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Projeto
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Período
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                  Criado em
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleReports.map((r: any) => {
                const status = String(r.status ?? "");
                const isDraft = status.toUpperCase() === "DRAFT";
                const statusLabel =
                  REPORT_STATUS_LABEL[r.status as ReportStatus] ?? status;

                return (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-900">
                        {fallbackTitle(r.title, r.period_start, r.period_end)}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-slate-600">
                      {r.project_label ?? "Projeto vinculado"}
                    </td>

                    <td className="px-4 py-4 align-top text-slate-600">
                      {formatDate(r.period_start)} → {formatDate(r.period_end)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                          status
                        )}`}
                      >
                        {statusLabel}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-slate-600">
                      {formatDateTime(r.created_at)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/dashboard/reports/${r.id}`}
                          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                        >
                          {role === "ORG" ? "Visualizar" : "Avaliar"}
                        </Link>

                        {canDuplicate && (
                          <form action={doDuplicate.bind(null, r.id)}>
                            <button
                              className="text-sm text-slate-700 hover:underline"
                              type="submit"
                            >
                              Duplicar
                            </button>
                          </form>
                        )}

                        {canDelete && (
                          <ConfirmDeleteButton
                            action={doDelete.bind(null, r.id)}
                            disabled={!isDraft}
                            title={
                              !isDraft
                                ? "Só é possível excluir quando o relatório está em rascunho."
                                : "Excluir relatório"
                            }
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visibleReports.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    {allReports.length === 0
                      ? "Nenhum relatório encontrado."
                      : `Nenhum relatório com o status "${
                          STATUS_FILTERS.find((f) => f.key === activeStatus)
                            ?.label ?? activeStatus
                        }".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
