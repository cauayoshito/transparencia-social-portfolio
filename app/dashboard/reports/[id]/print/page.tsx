/**
 * /dashboard/reports/[id]/print — Versão completa do relatório para
 * exportação em PDF (via impressão do navegador), no formato do documento
 * de prestação de contas do protótipo PHI (4.1):
 *
 *   Sobre a Organização / Dados do projeto
 *   Acompanhamento de atividades
 *   Registro fotográfico
 *   Relatório financeiro (+ resumo)
 *   Relatório de remanejamento
 *   Relação de recibos e notas fiscais
 *   Extratos bancários
 *   Conteúdo do relatório (template)
 *   Declaração final
 */

import { notFound } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import {
  getReportDetail,
  getReportTemplateForProjectType,
} from "@/services/reports.service";
import { getProjectByIdForUser } from "@/services/projects.service";
import { getReportFinancialData } from "@/services/report-financial.service";
import { listProjectMilestones } from "@/services/project-milestones.service";
import { listProjectGoals } from "@/services/project-goals.service";
import { listProjectCounterparts } from "@/services/project-schedule.service";
import { createClient } from "@/lib/supabase/server";
import PrintReportButton from "@/components/reports/PrintReportButton";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

function formatDate(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v));
}

function fallback(value: unknown, fb = "-") {
  const s = String(value ?? "").trim();
  return s.length ? s : fb;
}

const TARGET_AUDIENCE_LABELS: Record<string, string> = {
  criancas: "Crianças",
  adolescentes: "Adolescentes",
  jovens: "Jovens",
  adultos: "Adultos",
  idosos: "Idosos",
  mulheres: "Mulheres",
  familias: "Famílias",
  pessoas_rua: "Pessoas em situação de rua",
  apenados: "Apenados e egressos",
  grupos_minorizados: "Grupos minorizados",
  migrantes: "Migrantes",
  pcd: "Pessoas com deficiência",
  professores: "Professores e facilitadores",
  outros: "Outros",
};

type PhotoItem = {
  path: string;
  name: string;
  caption?: string | null;
};

async function signedUrlFor(path: string) {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("reports")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-slate-800 px-4 py-2 text-center text-sm font-semibold text-white print:bg-slate-800">
      {title}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-2 border-b border-slate-100 py-1.5 text-sm last:border-b-0">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

export default async function ReportPrintPage({ params }: Props) {
  const user = await requireUser();
  const reportId = params.id;

  const detail = await getReportDetail(reportId, user.id).catch(() => null);
  if (!detail?.report) notFound();

  const { report, currentVersion } = detail;

  const projectFull = await getProjectByIdForUser(report.project_id, user.id);
  if (!projectFull) notFound();

  const { getOrganizationByIdForUser } = await import(
    "@/services/organizations.service"
  );

  const isIncentivado =
    String((projectFull as any).project_type ?? "").toUpperCase() ===
    "INCENTIVADO";

  const [organization, financialData, milestones, templateData, counterparts] =
    await Promise.all([
      getOrganizationByIdForUser((projectFull as any).organization_id).catch(
        () => null,
      ),
      getReportFinancialData(reportId),
      listProjectMilestones(String(report.project_id), user.id).catch(() => []),
      getReportTemplateForProjectType(
        (projectFull as any).project_type,
      ).catch(() => null),
      isIncentivado
        ? listProjectCounterparts(String(report.project_id)).catch(() => [])
        : Promise.resolve([]),
    ]);

  // Avaliações deste relatório (atividades + contrapartidas)
  const supabaseRev = createClient();
  const [{ data: actRevData }, { data: cpRevData }] = await Promise.all([
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
  ]);
  const reviewByMilestone = new Map<string, any>(
    (actRevData ?? []).map((r: any) => [r.milestone_id, r]),
  );
  const reviewByCounterpart = new Map<string, any>(
    (cpRevData ?? []).map((r: any) => [r.counterpart_id, r]),
  );

  const fmtMonth = (v: string | null) => {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? "-"
      : new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(d);
  };

  const data = (currentVersion?.data as any) ?? {};
  const photos: PhotoItem[] = Array.isArray(data?.__assets?.photos)
    ? data.__assets.photos
    : [];
  const photosWithUrls = await Promise.all(
    photos.map(async (p) => ({ ...p, signedUrl: await signedUrlFor(p.path) })),
  );

  const p = projectFull as any;
  const orgName =
    (organization as any)?.name ?? (organization as any)?.legal_name ?? "-";
  const projectTitle = p.title ?? p.name ?? "Projeto";
  const audiences: string[] = Array.isArray(p.target_audience)
    ? p.target_audience
    : [];

  const sections =
    (templateData?.sections as any[])?.map((s: any) => ({
      title: s.title ?? "Seção",
      fields: (s.fields ?? []).map((f: any) => ({
        key: String(f.key),
        label: f.label ?? String(f.key),
      })),
    })) ?? [];

  const { summary, reallocations, receipts, bankStatements } = financialData;

  // Financeiro vem do orçamento do projeto; gasto = soma dos recibos por item.
  const { getProjectBudgetSnapshot } = await import(
    "@/services/project-budget.service"
  );
  const budget = await getProjectBudgetSnapshot(
    String(report.project_id),
  ).catch(() => ({ items: [] as any[] }));
  const budgetItems = (budget as any).items ?? [];
  const gastoByBudget = new Map<string, number>();
  for (const r of receipts as any[]) {
    const bid = r.budget_item_id;
    if (!bid) continue;
    gastoByBudget.set(String(bid), (gastoByBudget.get(String(bid)) ?? 0) + Number(r.receipt_value ?? 0));
  }

  const { data: transfersData } = await createClient()
    .from("report_transfers" as any)
    .select("id, amount, transfer_date, transfer_type")
    .eq("report_id", reportId);
  const reportTransfers = (transfersData ?? []) as any[];

  // Metas do projeto + progresso + acumulado
  const projectGoals = await listProjectGoals(String(report.project_id)).catch(
    () => [],
  );
  const supabaseGoals = createClient();
  const [{ data: gProg }, { data: gAcc }] = await Promise.all([
    (supabaseGoals as any)
      .from("report_goal_progress")
      .select("goal_id, realized_period, evaluation")
      .eq("report_id", reportId),
    (supabaseGoals as any)
      .from("report_goal_progress")
      .select("goal_id, realized_period, reports!inner(project_id)")
      .eq("reports.project_id", String(report.project_id)),
  ]);
  const goalProgByGoal = new Map<string, any>(
    (gProg ?? []).map((r: any) => [r.goal_id, r]),
  );
  const goalAcc: Record<string, number> = {};
  for (const r of gAcc ?? []) {
    const gid = String((r as any).goal_id);
    goalAcc[gid] = (goalAcc[gid] ?? 0) + Number((r as any).realized_period ?? 0);
  }
  const parseTarget = (v: string | null) => {
    if (!v) return null;
    const m = String(v).replace(/\./g, "").replace(",", ".").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 bg-white p-6 print:max-w-none print:space-y-4 print:p-0">
      {/* Barra de ações (some na impressão) */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Exportar relatório
          </h1>
          <p className="text-sm text-slate-600">
            Use &quot;Exportar PDF / Imprimir&quot; e escolha{" "}
            <strong>Salvar como PDF</strong> no diálogo do navegador.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/dashboard/reports/${reportId}/excel`}
            className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            📊 Gerar Excel
          </a>
          <PrintReportButton />
        </div>
      </div>

      {/* Cabeçalho do documento */}
      <header className="rounded border border-slate-300 print:rounded-none">
        <div className="bg-slate-800 px-4 py-3 text-center text-white">
          <p className="text-xs uppercase tracking-wider text-slate-300">
            Transparência Social — Prestação de Contas
          </p>
          <h2 className="text-lg font-bold">Relatório de Atividades</h2>
        </div>
        <div className="p-4">
          <InfoRow label="Organização" value={fallback(orgName)} />
          <InfoRow label="Projeto" value={fallback(projectTitle)} />
          <InfoRow
            label="Período do Relatório"
            value={`${formatDate(report.period_start)} - ${formatDate(report.period_end)}`}
          />
          <InfoRow
            label="Período total do apoio"
            value={`${formatDate(p.start_date ?? p.created_at)} - ${formatDate(p.end_date)}`}
          />
          <InfoRow
            label="Orçamento Total"
            value={p.total_value != null ? formatCurrency(p.total_value) : "-"}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <InfoRow label="UF do Projeto" value={fallback(p.state_uf)} />
            <InfoRow
              label="Área de Atuação"
              value={fallback(p.area_of_action)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <InfoRow
              label="Qtd. de beneficiários"
              value={p.people_served != null ? String(p.people_served) : "-"}
            />
            <InfoRow
              label="Coordenador/Gerente"
              value={fallback(p.coordinator_name)}
            />
          </div>
          {audiences.length > 0 && (
            <InfoRow
              label="Público-alvo"
              value={audiences
                .map((a) => TARGET_AUDIENCE_LABELS[a] ?? a)
                .join(", ")}
            />
          )}
          {p.observations && (
            <InfoRow label="Observações" value={String(p.observations)} />
          )}
          {/* Campos específicos por tipo (overview_data) */}
          {(() => {
            const EXTRA_LABELS: Record<string, [string, string][]> = {
              INCENTIVADO: [
                ["lei_incentivo", "Lei de Incentivo"],
                ["pronac", "Número PRONAC"],
                ["proponente", "Proponente"],
                ["cnpj", "CNPJ"],
                ["municipios_execucao", "Município(s) de execução"],
                ["empresa_incentivadora", "Empresa incentivadora"],
                ["valor_incentivado", "Valor incentivado (R$)"],
              ],
              RECURSOS_PUBLICOS: [
                ["edital_numero", "Número do Edital"],
                ["municipio_fundo", "Município do Fundo"],
                ["conselho", "Conselho responsável"],
                ["inscricao_conselho", "Inscrição no conselho"],
                ["termo_numero", "Nº do Termo"],
                ["termo_assinatura", "Data de assinatura"],
                ["termo_vigencia", "Vigência"],
                ["valor_aprovado", "Valor aprovado (R$)"],
                ["eixo_atuacao", "Eixo de atuação"],
              ],
              RECURSOS_PROPRIOS: [
                ["municipio", "Município"],
                ["responsavel_tecnico", "Responsável técnico"],
                ["contato_telefone", "Telefone"],
                ["contato_email", "E-mail"],
                ["empresa_investidora", "Empresa investidora"],
                ["forma_repasse", "Forma de repasse"],
              ],
            };
            const typeKey = String(p.project_type ?? "").toUpperCase();
            const ov = (p.overview_data ?? {}) as Record<string, unknown>;
            const rows = (EXTRA_LABELS[typeKey] ?? [])
              .map(([k, l]) => [l, String(ov[k] ?? "").trim()] as const)
              .filter(([, v]) => v.length > 0);
            return rows.map(([label, value]) => (
              <InfoRow key={label} label={label} value={value} />
            ));
          })()}
        </div>
      </header>

      {/* Acompanhamento de atividades */}
      <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
        <SectionHeader title="Acompanhamento de atividades" />
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 font-semibold text-slate-700">
              <th className="px-3 py-2">Período</th>
              <th className="px-3 py-2">Atividade</th>
              <th className="px-3 py-2">Execução</th>
              <th className="px-3 py-2">Avaliação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {milestones.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                  Nenhuma atividade no cronograma do projeto.
                </td>
              </tr>
            ) : (
              milestones.map((m: any) => {
                const rev = reviewByMilestone.get(m.id) as any;
                return (
                  <tr key={m.id} className="align-top">
                    <td className="px-3 py-2">{fmtMonth(m.starts_at)}</td>
                    <td className="whitespace-pre-wrap px-3 py-2">{m.title}</td>
                    <td className="px-3 py-2">{rev?.execution ?? "-"}</td>
                    <td className="whitespace-pre-wrap px-3 py-2">
                      {rev?.evaluation ?? "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Indicadores e metas */}
      {projectGoals.length > 0 && (
        <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
          <SectionHeader title="Indicadores e metas" />
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 font-semibold text-slate-700">
                <th className="px-2 py-2">Objetivo / meta</th>
                <th className="px-2 py-2">Indicador</th>
                <th className="px-2 py-2 text-right">Meta</th>
                <th className="px-2 py-2 text-right">No período</th>
                <th className="px-2 py-2 text-right">Acumulado</th>
                <th className="px-2 py-2 text-right">%</th>
                <th className="px-2 py-2">Avaliação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectGoals.map((g: any) => {
                const p = goalProgByGoal.get(g.id);
                const alvo = parseTarget(g.target_value);
                const acc = goalAcc[g.id] ?? 0;
                const pct = alvo && alvo > 0 ? Math.round((acc / alvo) * 1000) / 10 : null;
                return (
                  <tr key={g.id} className="align-top">
                    <td className="px-2 py-1.5">{g.title}</td>
                    <td className="px-2 py-1.5">{g.indicator ?? "-"}</td>
                    <td className="px-2 py-1.5 text-right">{g.target_value ?? "-"}</td>
                    <td className="px-2 py-1.5 text-right">{Number(p?.realized_period ?? 0)}</td>
                    <td className="px-2 py-1.5 text-right">{acc}</td>
                    <td className="px-2 py-1.5 text-right">{pct == null ? "-" : `${pct}%`}</td>
                    <td className="whitespace-pre-wrap px-2 py-1.5">{p?.evaluation ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Contrapartidas (INCENTIVADO) */}
      {isIncentivado && counterparts.length > 0 && (
        <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
          <SectionHeader title="Contrapartidas" />
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 font-semibold text-slate-700">
                <th className="px-3 py-2">Contrapartida</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2">Execução</th>
                <th className="px-3 py-2">Comentário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {counterparts.map((c) => {
                const review = reviewByCounterpart.get(c.id);
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-3 py-2 font-medium">{c.title}</td>
                    <td className="whitespace-pre-wrap px-3 py-2">
                      {c.description ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {review?.execution ?? "Não avaliada"}
                    </td>
                    <td className="whitespace-pre-wrap px-3 py-2">
                      {review?.comment ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Registro fotográfico */}
      <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
        <SectionHeader title="Registro fotográfico" />
        <div className="p-4">
          {photosWithUrls.length === 0 ? (
            <p className="text-center text-sm text-slate-500">
              Nenhuma foto enviada.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photosWithUrls.map((ph) =>
                ph.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <figure key={ph.path} className="break-inside-avoid">
                    <img
                      src={ph.signedUrl}
                      alt={ph.caption || ph.name}
                      className="h-40 w-full rounded border border-slate-200 object-cover"
                    />
                    {(ph.caption || ph.name) && (
                      <figcaption className="mt-1 text-[11px] text-slate-600">
                        {ph.caption || ph.name}
                      </figcaption>
                    )}
                  </figure>
                ) : null,
              )}
            </div>
          )}
        </div>
      </section>

      {/* Relatório financeiro */}
      <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
        <SectionHeader title="Relatório financeiro" />
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 font-semibold text-slate-700">
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Item</th>
              <th className="px-2 py-2 text-right">Orçamento previsto</th>
              <th className="px-2 py-2 text-right">Gasto no período</th>
              <th className="px-2 py-2 text-right">Disponível</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {budgetItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                  Nenhum item no orçamento do projeto.
                </td>
              </tr>
            ) : (
              budgetItems.map((b: any) => {
                const gasto = gastoByBudget.get(b.id) ?? 0;
                return (
                  <tr key={b.id}>
                    <td className="px-2 py-1.5">{b.investment_type}</td>
                    <td className="px-2 py-1.5">{b.item_description}</td>
                    <td className="px-2 py-1.5 text-right">
                      {formatCurrency(b.planned_amount)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {formatCurrency(gasto)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium">
                      {formatCurrency(Number(b.planned_amount) - gasto)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="border-t border-slate-300 p-4">
          <table className="mx-auto w-full max-w-sm text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-1.5 font-medium text-slate-700">
                  Saldo Planejado
                </td>
                <td className="py-1.5 text-right font-semibold">
                  {formatCurrency(summary?.planned_balance)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 font-medium text-slate-700">
                  Saldo anterior
                </td>
                <td className="py-1.5 text-right">
                  {formatCurrency(summary?.previous_balance)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 font-medium text-slate-700">
                  Repasse no período
                </td>
                <td className="py-1.5 text-right">
                  {formatCurrency(summary?.period_transfer)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5 font-medium text-slate-700">Gasto real</td>
                <td className="py-1.5 text-right">
                  {formatCurrency(summary?.actual_expenses)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 font-semibold text-slate-900">
                  Saldo em conta
                </td>
                <td className="py-1.5 text-right font-bold text-slate-900">
                  {formatCurrency(summary?.account_balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Repasse do recurso */}
      {reportTransfers.length > 0 && (
        <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
          <SectionHeader title="Repasse do recurso" />
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 font-semibold text-slate-700">
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportTransfers.map((t: any) => (
                <tr key={t.id}>
                  <td className="px-2 py-1.5">{formatDate(t.transfer_date)}</td>
                  <td className="px-2 py-1.5">{t.transfer_type ?? "-"}</td>
                  <td className="px-2 py-1.5 text-right font-medium">
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Relatório de remanejamento */}
      <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
        <SectionHeader title="Relatório de remanejamento" />
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 font-semibold text-slate-700">
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Item</th>
              <th className="px-2 py-2 text-right">Vl Previsto</th>
              <th className="px-2 py-2">Novo Tipo</th>
              <th className="px-2 py-2">Novo Item</th>
              <th className="px-2 py-2 text-right">Vl Remanejado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reallocations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                  Nenhum remanejamento cadastrado.
                </td>
              </tr>
            ) : (
              reallocations.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1.5">{r.original_type}</td>
                  <td className="px-2 py-1.5">{r.original_item}</td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(r.original_value)}
                  </td>
                  <td className="px-2 py-1.5">{r.new_type ?? "-"}</td>
                  <td className="px-2 py-1.5">{r.new_item ?? "-"}</td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(r.reallocated_value)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Relação de recibos e notas fiscais */}
      <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
        <SectionHeader title="Relação de recibos e notas fiscais" />
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 font-semibold text-slate-700">
              <th className="px-2 py-2">Item Planejamento</th>
              <th className="px-2 py-2">Item da Nota</th>
              <th className="px-2 py-2 text-right">Valor</th>
              <th className="px-2 py-2">Número</th>
              <th className="px-2 py-2">Data</th>
              <th className="px-2 py-2">Remanejado?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                  Nenhum recibo cadastrado.
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1.5">{r.planning_item}</td>
                  <td className="px-2 py-1.5">{r.receipt_description}</td>
                  <td className="px-2 py-1.5 text-right">
                    {formatCurrency(r.receipt_value)}
                  </td>
                  <td className="px-2 py-1.5">{r.receipt_number ?? "-"}</td>
                  <td className="px-2 py-1.5">{formatDate(r.receipt_date)}</td>
                  <td className="px-2 py-1.5">
                    {r.is_reallocated ? "SIM" : "NÃO"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Extratos bancários */}
      <section className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none">
        <SectionHeader title="Extratos Bancários" />
        <div className="p-4">
          {bankStatements.length === 0 ? (
            <p className="text-center text-sm text-slate-500">
              Nenhum extrato bancário enviado.
            </p>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-800">
              {bankStatements.map((bs) => (
                <li key={bs.id}>
                  {bs.label}
                  {bs.status ? ` — ${bs.status}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Conteúdo do relatório (template) */}
      {sections.map((section, idx) => (
        <section
          key={idx}
          className="overflow-hidden rounded border border-slate-300 break-inside-avoid print:rounded-none"
        >
          <SectionHeader title={section.title} />
          <div className="space-y-3 p-4">
            {section.fields.map((field: { key: string; label: string }) => (
              <div key={field.key}>
                <p className="text-xs font-semibold text-slate-600">
                  {field.label}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap border-b border-slate-100 pb-2 text-sm text-slate-900">
                  {fallback(data?.[field.key], "—")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Declaração final */}
      <section className="rounded border border-slate-300 p-4 text-justify text-xs leading-5 text-slate-700 break-inside-avoid print:rounded-none">
        <p>
          Declaro que todas as informações inseridas neste relatório são
          verdadeiras e que a organização possui autorização para uso e
          compartilhamento das imagens inseridas neste documento, podendo o
          financiador utilizá-las em suas campanhas promocionais e
          institucionais, sem que nada haja a ser reclamado a título de
          direitos conexos.
        </p>
        <p className="mt-3 text-slate-500">
          Documento gerado em {formatDate(new Date().toISOString())} pelo
          sistema Transparência Social.
        </p>
      </section>
    </main>
  );
}
