import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole } from "@/lib/roles";
import {
  getReportDetail,
  getLatestReview,
  getConsultantRecommendation,
  projectHasActiveConsultant,
} from "@/services/reports.service";
import { getReportFinancialData } from "@/services/report-financial.service";
import {
  submitReportAction,
  reopenReportToDraftAction,
} from "@/app/actions/report.actions";
import ReviewReportButtons from "@/components/dashboard/ReviewReportButtons";
import { REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

function formatDate(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

function formatDateTime(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

function fallbackTitle(title: string | null, start: unknown, end: unknown) {
  if (title && title.trim()) return title;
  return `Relatório ${formatDate(start)} → ${formatDate(end)}`;
}

function fallback(value: unknown, fb = "-") {
  const s = String(value ?? "").trim();
  return s.length ? s : fb;
}

function shortId(value: unknown) {
  const s = String(value ?? "").trim();
  if (!s) return "-";
  if (s.length <= 16) return s;
  return `${s.slice(0, 8)}...${s.slice(-4)}`;
}

function reportStatusLabel(value: unknown) {
  const key = String(value ?? "")
    .trim()
    .toUpperCase() as ReportStatus;
  return REPORT_STATUS_LABEL[key] ?? fallback(value);
}

async function safeSubmit(reportId: string) {
  "use server";
  await submitReportAction(reportId);
}

async function safeReopen(reportId: string) {
  "use server";
  await reopenReportToDraftAction(reportId);
}

export default async function ReportDetailPage({ params }: Props) {
  const user = await requireUser();

  let role: ReturnType<typeof getPrimaryRole> = "ORG";
  try {
    const ctx = await getUserContext(user.id);
    role = getPrimaryRole(ctx);
  } catch {
    // fallback ORG
  }

  const reportId = params.id;
  const detail = await getReportDetail(reportId, user.id).catch(() => null);
  if (!detail?.report) notFound();

  const { report, project, currentVersion } = detail;

  const status = String(report.status ?? "")
    .trim()
    .toUpperCase();
  const statusLabel = reportStatusLabel(status);

  const isOrg = role === "ORG";
  const isInvestor = role === "INVESTOR";
  const isConsultantRole = role === "CONSULTANT";

  // Verificar se projeto tem consultor ativo
  const hasConsultant = await projectHasActiveConsultant(report.project_id);

  // ===== Permissões por perfil =====

  // ORG: cria, edita (DRAFT/RETURNED), envia, reabe (RETURNED)
  const canEdit =
    (isOrg && (status === "DRAFT" || status === "RETURNED")) ||
    (isInvestor && status === "DRAFT");
  const canSubmit =
    (isOrg && (status === "DRAFT" || status === "RETURNED")) ||
    (isInvestor && status === "DRAFT");
  const canReopen = isOrg && status === "RETURNED";

  // Quem avalia: CONSULTOR se existir, senão INVESTIDOR
  const canReview =
    status === "SUBMITTED" &&
    ((hasConsultant && isConsultantRole) ||
      (!hasConsultant && isInvestor));

  // Mensagem de quem é o avaliador atual
  const reviewerRoleLabel = hasConsultant ? "CONSULTANT" : "INVESTOR";

  const isLockedForOrg =
    isOrg &&
    (status === "SUBMITTED" || status === "APPROVED");

  // Buscar dados em paralelo: avaliações + dados financeiros completos do relatório
  const [latestReview, recommendation, financialData] = await Promise.all([
    getLatestReview(reportId),
    getConsultantRecommendation(reportId),
    getReportFinancialData(reportId).catch(() => ({
      items: [],
      summary: null,
      reallocations: [],
      receipts: [],
      bankStatements: [],
    })),
  ]);

  const hasReviewComment =
    latestReview?.comment && latestReview.comment.trim().length > 0;

  const hasRecommendation =
    recommendation?.comment && recommendation.comment.trim().length > 0;

  // Extrair campos de conteúdo do relatório (excluindo __assets que são arquivos internos)
  const versionData = (currentVersion?.data as Record<string, unknown>) ?? {};
  const contentEntries = Object.entries(versionData).filter(
    ([key]) => key !== "__assets" && !key.startsWith("_")
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            {fallbackTitle(
              report.title ?? null,
              report.period_start,
              report.period_end
            )}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Projeto:{" "}
            <span className="font-medium">
              {project?.name ?? "Projeto vinculado"}
            </span>
          </p>

          <p className="text-sm text-slate-600">
            Período:{" "}
            <span className="font-medium">
              {formatDate(report.period_start)} →{" "}
              {formatDate(report.period_end)}
            </span>
          </p>

          <p className="text-sm text-slate-600">
            Status: <span className="font-semibold">{statusLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/reports"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Voltar
          </Link>

          <Link
            href={`/dashboard/reports/${reportId}/print`}
            target="_blank"
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🖨️ Exportar PDF
          </Link>

          {canEdit && (
            <Link
              href={`/dashboard/reports/${reportId}/edit`}
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90"
            >
              Digitar relatório
            </Link>
          )}

          {canSubmit && (
            <form action={safeSubmit.bind(null, reportId)}>
              <button
                className="rounded bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700"
                type="submit"
              >
                Enviar para análise
              </button>
            </form>
          )}

          {canReopen && (
            <form action={safeReopen.bind(null, reportId)}>
              <button
                className="rounded bg-slate-800 px-4 py-2 text-sm text-white transition hover:bg-slate-900"
                type="submit"
              >
                Reabrir p/ rascunho
              </button>
            </form>
          )}

          {/* Botões de aprovar/devolver — CONSULTOR ou INVESTOR conforme regra */}
          {canReview && (
            <ReviewReportButtons
              reportId={reportId}
              roleLabel={reviewerRoleLabel}
            />
          )}
        </div>
      </header>

      {/* Informação sobre quem avalia */}
      {status === "SUBMITTED" && !canReview && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {hasConsultant
            ? "Este relatório foi enviado e aguarda avaliação do consultor vinculado ao projeto."
            : "Este relatório foi enviado e aguarda avaliação do financiador."}
        </div>
      )}

      {/* Parecer/recomendação do consultor (legacy) */}
      {hasRecommendation && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">📋</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-indigo-900">
                Parecer do consultor
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-indigo-800">
                {recommendation!.comment}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Emitido em {formatDateTime(recommendation!.created_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comentário do avaliador — visível quando devolvido ou aprovado */}
      {hasReviewComment && (status === "RETURNED" || status === "APPROVED") && (
        <div
          className={[
            "rounded-lg border p-4",
            status === "RETURNED"
              ? "border-rose-200 bg-rose-50"
              : "border-emerald-200 bg-emerald-50",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">
              {status === "RETURNED" ? "💬" : "✅"}
            </span>
            <div className="min-w-0">
              <h3
                className={[
                  "text-sm font-semibold",
                  status === "RETURNED" ? "text-rose-900" : "text-emerald-900",
                ].join(" ")}
              >
                {status === "RETURNED"
                  ? "Observação do avaliador"
                  : "Comentário de aprovação"}
              </h3>
              <p
                className={[
                  "mt-1 whitespace-pre-wrap text-sm",
                  status === "RETURNED" ? "text-rose-800" : "text-emerald-800",
                ].join(" ")}
              >
                {latestReview!.comment}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDateTime(latestReview!.created_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {isLockedForOrg && status === "SUBMITTED" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Relatório enviado para análise. A edição está temporariamente
          bloqueada até nova devolução ou conclusão da avaliação.
        </div>
      )}

      {isOrg && status === "RETURNED" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Relatório devolvido para ajustes. Corrija os itens indicados e
          reenvie para análise.
        </div>
      )}

      {status === "APPROVED" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Este relatório foi aprovado. Nenhuma ação adicional necessária.
        </div>
      )}

      {/* Investidor vê aviso quando consultor é o avaliador */}
      {isInvestor && status === "SUBMITTED" && hasConsultant && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Este projeto possui consultor vinculado. A avaliação do relatório é
          responsabilidade do consultor.
        </div>
      )}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold text-slate-900">Dados</h2>

        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Identificador</div>
            <div className="font-medium text-slate-900">
              {shortId(report.id)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Criado em</div>
            <div>{formatDateTime(report.created_at)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Versão atual</div>
            <div>{fallback(report.current_version)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Enviado em</div>
            <div>{formatDateTime(report.submitted_at)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Aprovado em</div>
            <div>{formatDateTime(report.approved_at)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Avaliador</div>
            <div>
              {hasConsultant ? "Consultor" : "Financiador"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold text-slate-900">Versão atual</h2>
        <p className="text-xs text-slate-600">
          Informações da versão ativa do relatório.
        </p>

        {!currentVersion ? (
          <div className="mt-3 text-sm text-slate-500">
            Nenhuma versão encontrada.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">Versão</div>
              <div>v{String(currentVersion.version_number)}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Status</div>
              <div>{reportStatusLabel(currentVersion.status)}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Criado em</div>
              <div>{formatDateTime(currentVersion.created_at)}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Criado por</div>
              <div className="text-slate-700">
                {shortId(currentVersion.created_by)}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Conteúdo do relatório — campos narrativos preenchidos pela ORG */}
      {contentEntries.length > 0 && (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold text-slate-900">Conteúdo do relatório</h2>
          <p className="text-xs text-slate-600">
            Campos preenchidos pela organização no período de execução.
          </p>
          <div className="mt-4 space-y-4">
            {contentEntries.map(([key, value]) => (
              <div key={key}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {key.replace(/_/g, " ")}
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm whitespace-pre-wrap text-slate-800">
                  {value === null || value === undefined || String(value).trim() === ""
                    ? <span className="italic text-slate-400">Não preenchido</span>
                    : typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dados financeiros — itens do planejamento financeiro */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <h2 className="font-semibold text-slate-900">Dados financeiros</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Itens do planejamento financeiro registrados neste relatório.
          </p>
        </div>

        {financialData.items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            Nenhum item financeiro registrado neste relatório.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-800 text-white">
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Descrição</th>
                  <th className="px-3 py-2.5 font-medium text-right">Planejado</th>
                  <th className="px-3 py-2.5 font-medium text-right">Gasto total</th>
                  <th className="px-3 py-2.5 font-medium text-right">Gastos período</th>
                  <th className="px-3 py-2.5 font-medium text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financialData.items.map((item) => {
                  const planned = Number(item.budget_planned ?? 0);
                  const totalSpent = Number(item.total_spent ?? 0);
                  const periodExpenses = Number(item.period_expenses ?? 0);
                  const balance = Number(item.current_balance ?? 0);
                  const fmt = (v: number) =>
                    new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(v);
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{item.investment_type}</td>
                      <td className="max-w-[200px] truncate px-3 py-2">{item.item_description}</td>
                      <td className="px-3 py-2 text-right">{fmt(planned)}</td>
                      <td className="px-3 py-2 text-right">{fmt(totalSpent)}</td>
                      <td className="px-3 py-2 text-right">{fmt(periodExpenses)}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-xs">
                  <td className="px-3 py-2.5" colSpan={2}>Total</td>
                  <td className="px-3 py-2.5 text-right">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      financialData.items.reduce((s, i) => s + Number(i.budget_planned ?? 0), 0)
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      financialData.items.reduce((s, i) => s + Number(i.total_spent ?? 0), 0)
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      financialData.items.reduce((s, i) => s + Number(i.period_expenses ?? 0), 0)
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      financialData.items.reduce((s, i) => s + Number(i.current_balance ?? 0), 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Comprovantes / Recibos */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Comprovantes</h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Recibos e notas fiscais anexados neste relatório.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {financialData.receipts.length}{" "}
              {financialData.receipts.length === 1 ? "recibo" : "recibos"}
            </span>
          </div>
        </div>

        {financialData.receipts.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            Nenhum comprovante registrado neste relatório.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-emerald-50 font-semibold text-slate-700">
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2">Número</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Arquivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financialData.receipts.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50">
                    <td className="max-w-[220px] truncate px-3 py-2">{r.receipt_description}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(r.receipt_value ?? 0))}
                    </td>
                    <td className="px-3 py-2">{r.receipt_number ?? "-"}</td>
                    <td className="px-3 py-2">
                      {r.receipt_date
                        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                            new Date(r.receipt_date)
                          )
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {r.file_name ? (
                        <span className="text-blue-600">{r.file_name}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-emerald-50 font-semibold text-xs">
                  <td className="px-3 py-2.5">Total de recibos</td>
                  <td className="px-3 py-2.5 text-right">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      financialData.receipts.reduce(
                        (s, r) => s + Number(r.receipt_value ?? 0),
                        0
                      )
                    )}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Extratos bancários */}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Extratos bancários</h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Extratos enviados neste relatório.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {financialData.bankStatements.length}{" "}
              {financialData.bankStatements.length === 1 ? "extrato" : "extratos"}
            </span>
          </div>
        </div>

        {financialData.bankStatements.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            Nenhum extrato bancário enviado neste relatório.
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {financialData.bankStatements.map((bs) => (
              <div
                key={bs.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {bs.status ?? "ENVIADA"}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{bs.label}</span>
                </div>
                {bs.file_name && (
                  <span className="text-xs text-blue-600">{bs.file_name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
