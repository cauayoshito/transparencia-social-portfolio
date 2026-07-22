import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import {
  getReportDetail,
  getReportTemplateForProjectType,
} from "@/services/reports.service";
import { getProjectByIdForUser } from "@/services/projects.service";
import {
  saveReportDraftFromEditorAction,
  uploadReportPhotoAction,
  removeReportPhotoAction,
} from "@/app/actions/report.actions";
import { getReportFinancialData } from "@/services/report-financial.service";
import { getProjectBudgetSnapshot } from "@/services/project-budget.service";
import ReportFinancialSection from "@/components/reports/ReportFinancialSection";
import ReportActivitiesSection from "@/components/reports/ReportActivitiesSection";
import ReportGoalsSection from "@/components/reports/ReportGoalsSection";
import ReportCounterpartsSection from "@/components/reports/ReportCounterpartsSection";
import { listProjectGoals } from "@/services/project-goals.service";
import { listProjectCounterparts } from "@/services/project-schedule.service";
import { listProjectMilestones } from "@/services/project-milestones.service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams?: {
    saved?: string;
    photo?: string;
    removed?: string;
    err?: string;
  };
};

function formatDate(value: unknown) {
  if (!value) return "-";
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function titleFallback(title: string | null, start: unknown, end: unknown) {
  if (title && title.trim()) return title;
  return `Relatório ${formatDate(start)} → ${formatDate(end)}`;
}

type TemplateFieldAny = {
  id?: string;
  key: string;
  label?: string | null;
  field_type?: string | null;
  placeholder?: string | null;
  help_text?: string | null;
  required?: boolean | null;
  max_length?: number | null;
};

type TemplateSectionAny = {
  id?: string;
  title?: string | null;
  name?: string | null;
  fields: TemplateFieldAny[];
};

type PhotoItem = {
  path: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  caption?: string | null;
};

async function signedUrlFor(path: string) {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("reports")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export default async function ReportEditPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const reportId = params.id;

  const detail = await getReportDetail(reportId, user.id).catch(() => null);
  if (!detail?.report) notFound();

  const { report, project, currentVersion } = detail;

  const reportStatus = String(report.status).toUpperCase();
  const canEdit = reportStatus === "DRAFT" || reportStatus === "RETURNED";

  const projectFull = await getProjectByIdForUser(report.project_id, user.id);
  if (!projectFull) notFound();

  const templateData = await getReportTemplateForProjectType(
    projectFull.project_type
  ).catch(() => null);

  const sections: TemplateSectionAny[] =
    (templateData?.sections as any[])?.map((s: any) => ({
      id: s.id,
      title: s.title ?? s.name ?? "Seção",
      fields: (s.fields ?? []).map((f: any) => ({
        id: f.id,
        key: String(f.key),
        label: f.label ?? f.name ?? String(f.key),
        field_type: f.field_type ?? f.type ?? "TEXT",
        placeholder: f.placeholder ?? "",
        help_text: f.help_text ?? "",
        required: Boolean(f.required),
        max_length: f.max_length ?? null,
      })),
    })) ?? [];

  const data = (currentVersion?.data as any) ?? {};
  const saved = searchParams?.saved === "1";

  const photos: PhotoItem[] = Array.isArray(data?.__assets?.photos)
    ? data.__assets.photos
    : [];
  const isIncentivado =
    String((projectFull as any).project_type ?? "").toUpperCase() ===
    "INCENTIVADO";

  const [photosWithUrls, financialData, milestones, projectBudget, counterparts] =
    await Promise.all([
      Promise.all(
        photos.map(async (p) => ({
          ...p,
          signedUrl: await signedUrlFor(p.path),
        }))
      ),
      getReportFinancialData(reportId),
      listProjectMilestones(String(report.project_id), user.id).catch(() => []),
      getProjectBudgetSnapshot(String(report.project_id)).catch(() => ({
        items: [], transfers: [],
        totals: { total_planned: 0, total_transfers_planned: 0, total_transfers_realized: 0 },
      })),
      isIncentivado
        ? listProjectCounterparts(String(report.project_id)).catch(() => [])
        : Promise.resolve([]),
    ]);

  // Avaliações + repasses registrados neste relatório
  const supabaseRev = createClient();
  const [{ data: activityRevData }, { data: cpRevData }, { data: transfersData }] =
    await Promise.all([
      (supabaseRev as any)
        .from("report_activity_reviews")
        .select("milestone_id, execution, evaluation")
        .eq("report_id", reportId),
      isIncentivado
        ? (supabaseRev as any)
            .from("report_counterpart_reviews")
            .select("counterpart_id, execution, comment")
            .eq("report_id", reportId)
        : Promise.resolve({ data: [] }),
      (supabaseRev as any)
        .from("report_transfers")
        .select("id, amount, transfer_date, transfer_type")
        .eq("report_id", reportId)
        .order("transfer_date", { ascending: true }),
    ]);
  const activityReviews = activityRevData ?? [];
  const reportTransfers = transfersData ?? [];

  // Metas do projeto + progresso deste relatório + acumulado (todos relatórios)
  const projectGoals = await listProjectGoals(String(report.project_id)).catch(
    () => [],
  );
  const [{ data: goalProgData }, { data: goalAccumData }] = await Promise.all([
    (supabaseRev as any)
      .from("report_goal_progress")
      .select("goal_id, realized_period, evaluation")
      .eq("report_id", reportId),
    (supabaseRev as any)
      .from("report_goal_progress")
      .select("goal_id, realized_period, reports!inner(project_id)")
      .eq("reports.project_id", String(report.project_id)),
  ]);
  const goalProgress = goalProgData ?? [];
  const accumulatedByGoal: Record<string, number> = {};
  for (const row of goalAccumData ?? []) {
    const gid = String((row as any).goal_id);
    accumulatedByGoal[gid] =
      (accumulatedByGoal[gid] ?? 0) + Number((row as any).realized_period ?? 0);
  }
  const counterpartReviews = cpRevData ?? [];

  const periodYear = Number(String(report.period_start ?? "").slice(0, 4));
  const defaultYear = Number.isFinite(periodYear) && periodYear > 0
    ? periodYear
    : undefined;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-6 border-b bg-white/90 backdrop-blur px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Digitar relatório</h1>
            <p className="text-sm text-slate-600 mt-1">
              {titleFallback(
                report.title ?? null,
                report.period_start,
                report.period_end
              )}
            </p>
            <p className="text-xs text-slate-500">
              Projeto:{" "}
              <span className="font-medium">
                {project?.name ?? report.project_id}
              </span>{" "}
              • Período:{" "}
              <span className="font-medium">
                {formatDate(report.period_start)} →{" "}
                {formatDate(report.period_end)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/reports/${reportId}/print`}
              target="_blank"
              className="text-sm text-slate-700 hover:underline"
            >
              🖨️ Exportar PDF
            </Link>

            <a
              href={`/dashboard/reports/${reportId}/excel`}
              className="text-sm text-emerald-700 hover:underline"
            >
              📊 Gerar Excel
            </a>

            <Link
              href={`/dashboard/reports/${reportId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              Voltar ao detalhe
            </Link>

            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                canEdit
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
              title={canEdit ? "Edição liberada (DRAFT)" : "Edição bloqueada"}
            >
              {canEdit ? "Editável (DRAFT)" : "Somente leitura"}
            </span>
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
          Este relatório não está em <b>DRAFT</b>. Edição bloqueada. Reabra para
          rascunho no detalhe para editar.
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 text-sm">
          Rascunho salvo ✅
        </div>
      )}

      {searchParams?.photo === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 text-sm">
          Foto enviada ✅
        </div>
      )}

      {searchParams?.removed === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 text-sm">
          Foto removida ✅
        </div>
      )}

      {searchParams?.err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 text-sm">
          {decodeURIComponent(searchParams.err)}
        </div>
      )}

      {/* Acompanhamento de atividades (início do relatório) */}
      <ReportActivitiesSection
        reportId={reportId}
        canEdit={canEdit}
        milestones={milestones as any}
        reviews={activityReviews as any}
      />

      {/* Indicadores e metas (logo abaixo do acompanhamento de atividades) */}
      <ReportGoalsSection
        reportId={reportId}
        canEdit={canEdit}
        goals={projectGoals as any}
        progress={goalProgress as any}
        accumulatedByGoal={accumulatedByGoal}
      />

      {/* Contrapartidas (somente projetos incentivados) */}
      {isIncentivado && (
        <ReportCounterpartsSection
          reportId={reportId}
          canEdit={canEdit}
          counterparts={counterparts as any}
          reviews={counterpartReviews as any}
        />
      )}

      {/* Registro Fotográfico */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Registro fotográfico</h2>
        <p className="text-xs text-slate-600 mt-1">
          Envie fotos do mês (salvo no Storage e referenciado no rascunho).
        </p>

        <form
          action={async (formData) => {
            "use server";
            if (!canEdit) return;
            await uploadReportPhotoAction(reportId, formData);
          }}
          className="mt-3 grid gap-3 sm:grid-cols-6"
        >
          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs text-slate-600">Foto</label>
            <input
              name="photo"
              type="file"
              accept="image/*"
              required
              disabled={!canEdit}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs text-slate-600">
              Legenda (opcional)
            </label>
            <input
              name="caption"
              placeholder="Ex: Oficina com crianças, dia 12"
              disabled={!canEdit}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={!canEdit}
            className="sm:col-span-6 rounded bg-slate-900 px-4 py-2 text-white text-sm disabled:opacity-50"
          >
            Enviar foto
          </button>
        </form>

        <div className="mt-4">
          {photosWithUrls.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma foto enviada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {photosWithUrls.map((p) => (
                <li
                  key={p.path}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.caption || p.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {p.name} • {Math.round((p.size ?? 0) / 1024)} KB •{" "}
                      {String(p.uploadedAt).slice(0, 19)}
                    </div>
                    {p.signedUrl ? (
                      <a
                        href={p.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Abrir/baixar
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Link indisponível
                      </span>
                    )}
                  </div>

                  <form
                    action={async (fd) => {
                      "use server";
                      if (!canEdit) return;
                      await removeReportPhotoAction(reportId, fd);
                    }}
                  >
                    <input type="hidden" name="path" value={p.path} />
                    <button
                      type="submit"
                      disabled={!canEdit}
                      className="text-sm text-red-600 hover:underline disabled:opacity-40"
                      title="Remover foto"
                    >
                      Remover
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Seções financeiras (12-15 do PHI) */}
      <ReportFinancialSection
        reportId={reportId}
        canEdit={canEdit}
        items={financialData.items}
        budgetItems={(projectBudget as any).items ?? []}
        transfers={reportTransfers as any}
        summary={financialData.summary}
        reallocations={financialData.reallocations}
        receipts={financialData.receipts}
        bankStatements={financialData.bankStatements}
      />

      {/* Conteúdo via template */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Conteúdo do relatório</h2>
        <p className="text-xs text-slate-600 mt-1">
          Editor baseado no template do tipo do projeto. Campos salvam em{" "}
          <code>report_versions.data</code>.
        </p>

        <form
          action={async (formData) => {
            "use server";
            if (!canEdit) return;
            await saveReportDraftFromEditorAction(reportId, formData);
          }}
          className="mt-4 space-y-6"
        >
          {sections.length === 0 ? (
            <div className="text-sm text-slate-600">
              Nenhum template ativo encontrado para este tipo de projeto. Ative
              um template em <code>report_templates</code>.
            </div>
          ) : (
            sections.map((section, idx) => (
              <div
                key={section.id ?? idx}
                className="rounded-xl border bg-slate-50 p-4"
              >
                <h3 className="font-semibold">
                  {section.title ?? `Seção ${idx + 1}`}
                </h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {section.fields.map((field) => {
                    const value = data?.[field.key] ?? "";
                    const label = field.label ?? field.key;
                    const type = String(
                      field.field_type ?? "TEXT"
                    ).toUpperCase();

                    const common: any = {
                      name: `field__${field.key}`,
                      defaultValue: String(value ?? ""),
                      placeholder: field.placeholder ?? "",
                      maxLength: field.max_length ?? undefined,
                      required: Boolean(field.required),
                      disabled: !canEdit,
                      className:
                        "w-full rounded border px-3 py-2 bg-white disabled:bg-slate-100",
                    };

                    const isLong = type === "TEXTAREA" || type === "LONG_TEXT";

                    return (
                      <div
                        key={field.key}
                        className={isLong ? "sm:col-span-2" : ""}
                      >
                        <label className="mb-1 block text-xs text-slate-700">
                          {label}
                          {field.required ? (
                            <span className="text-rose-600"> *</span>
                          ) : null}
                        </label>

                        {isLong ? (
                          <textarea {...common} rows={6} />
                        ) : (
                          <input
                            {...common}
                            type={
                              type === "DATE"
                                ? "date"
                                : type === "NUMBER"
                                ? "number"
                                : "text"
                            }
                          />
                        )}

                        {field.help_text ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {field.help_text}
                          </p>
                        ) : null}

                        {field.max_length ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            Máx: {field.max_length} caracteres
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/dashboard/reports/${reportId}`}
              className="text-sm text-slate-700 hover:underline"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={!canEdit}
              className="rounded bg-slate-900 px-4 py-2 text-white text-sm disabled:opacity-50"
            >
              Salvar rascunho
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
