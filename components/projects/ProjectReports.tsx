import Link from "next/link";
import { createReportAction } from "@/app/actions/report.actions";
import { REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/status";

type Props = {
  projectId: string;
  reports: any[];
  role?: string;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  return String(iso).slice(0, 10);
}

function fallbackTitle(
  title: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined
) {
  if (title && title.trim()) return title;
  return `Relatório ${formatDate(start)} a ${formatDate(end)}`;
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-800";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-800";
    case "APPROVED":
      return "bg-green-100 text-green-800";
    case "RETURNED":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
}

export default function ProjectReports({ projectId, reports, role }: Props) {
  const defaults = getCurrentMonthRange();

  const canCreateReport = role === "ORG" || role === "INVESTOR";

  const descriptionText = canCreateReport
    ? "Cada relatório representa um período de execução do projeto. Aqui você registra atividades, resultados, dados financeiros, comprovantes, extratos e evidências do período."
    : "Acompanhe a prestação de contas de cada período. Cada relatório contém a execução, os comprovantes financeiros e as evidências do período.";

  const emptyStateText = canCreateReport
    ? "Nenhum relatório ainda. Crie o primeiro relatório para iniciar a prestação de contas do projeto."
    : "Nenhum relatório foi criado para este projeto.";

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Prestação de contas
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {descriptionText}
            </p>
          </div>

          <Link
            href="/dashboard/reports"
            className="text-sm text-blue-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {canCreateReport && (
        <form
          action={createReportAction}
          className="mt-4 grid gap-3 md:grid-cols-6"
        >
          <input type="hidden" name="project_id" value={projectId} />

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs text-slate-600">
              Título (opcional)
            </label>
            <input
              name="title"
              placeholder="Ex: Relatório mensal"
              className="w-full rounded border border-slate-200 px-3 py-2"
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-1 block text-xs text-slate-600">Tipo</label>
            <select
              name="period_type"
              className="w-full rounded border border-slate-200 px-3 py-2"
              defaultValue="MONTHLY"
            >
              <option value="MONTHLY">Mensal</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="mb-1 block text-xs text-slate-600">Início</label>
            <input
              name="period_start"
              type="date"
              className="w-full rounded border border-slate-200 px-3 py-2"
              defaultValue={defaults.start}
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-1 block text-xs text-slate-600">Fim</label>
            <input
              name="period_end"
              type="date"
              className="w-full rounded border border-slate-200 px-3 py-2"
              defaultValue={defaults.end}
              required
            />
          </div>

          <button
            className="w-full rounded bg-blue-600 px-4 py-2 text-white md:col-span-6"
            type="submit"
          >
            Criar relatório
          </button>
        </form>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-200 md:hidden">
          {reports.map((r: any) => (
            <div key={r.id} className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="break-words text-sm font-medium text-slate-900">
                    {fallbackTitle(r.title, r.period_start, r.period_end)}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Período: {formatDate(r.period_start)} a{" "}
                    {formatDate(r.period_end)}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(r.status)}`}
                >
                  {REPORT_STATUS_LABEL[r.status as ReportStatus] ??
                    String(r.status ?? "-")}
                </span>
              </div>

              <div className="grid gap-2 text-xs text-slate-600">
                <div>
                  <span className="font-medium text-slate-900">Data Solicitação:</span>{" "}
                  {formatDate(r.created_at)}
                </div>
                <div>
                  <span className="font-medium text-slate-900">1º Envio:</span>{" "}
                  {formatDate(r.submitted_at)}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Aprovação:</span>{" "}
                  {formatDate(r.approved_at)}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Nº Revisões:</span>{" "}
                  {r.current_version || 0}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Preenchido?</span>{" "}
                  {r.current_version > 0 ? "Sim" : "Não"}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  href={`/dashboard/reports/${r.id}`}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Visualizar
                </Link>
                {(r.status === "DRAFT" || r.status === "RETURNED") && canCreateReport && (
                  <Link
                    href={`/dashboard/reports/${r.id}/edit`}
                    className="flex-1 rounded-lg bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Editar
                  </Link>
                )}
              </div>
            </div>
          ))}

          {reports.length === 0 && (
            <div className="px-4 py-4 text-sm text-slate-500">
              {emptyStateText}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Título</th>
                <th className="px-4 py-3 font-semibold">Período</th>
                <th className="px-4 py-3 font-semibold">Data Envio</th>
                <th className="px-4 py-3 font-semibold">Data Aprovação</th>
                <th className="px-4 py-3 font-semibold">Nº Revisões</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Preenchido?</th>
                <th className="px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reports.map((r: any, idx: number) => (
                <tr
                  key={r.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {fallbackTitle(r.title, r.period_start, r.period_end)}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(r.period_start)} a {formatDate(r.period_end)}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(r.submitted_at)}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(r.approved_at)}
                  </td>

                  <td className="px-4 py-3 text-center text-slate-700">
                    {r.current_version || 0}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeColor(r.status)}`}
                    >
                      {REPORT_STATUS_LABEL[r.status as ReportStatus] ??
                        String(r.status ?? "-")}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center text-slate-700">
                    {r.current_version > 0 ? "Sim" : "Não"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/reports/${r.id}`}
                        className="text-blue-600 hover:underline"
                        title="Visualizar relatório"
                      >
                        Visualizar
                      </Link>
                      {(r.status === "DRAFT" || r.status === "RETURNED") && canCreateReport && (
                        <>
                          <span className="text-slate-300">|</span>
                          <Link
                            href={`/dashboard/reports/${r.id}/edit`}
                            className="text-blue-600 hover:underline"
                            title="Editar relatório"
                          >
                            Editar
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {reports.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-slate-500">
                    {emptyStateText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
