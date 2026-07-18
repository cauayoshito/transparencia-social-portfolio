/**
 * GET /dashboard/reports/[id]/excel
 *
 * Gera o relatório completo em .xlsx (equivalente ao "Gerar Excel" do
 * protótipo PHI), com uma aba por seção — os mesmos dados do export em PDF:
 *
 *   Dados do Projeto · Atividades · Financeiro · Remanejamento
 *   Recibos · Extratos · Conteúdo
 */

import * as XLSX from "xlsx";
import { requireUser } from "@/services/auth.service";
import {
  getReportDetail,
  getReportTemplateForProjectType,
} from "@/services/reports.service";
import { getProjectByIdForUser } from "@/services/projects.service";
import { getReportFinancialData } from "@/services/report-financial.service";
import { listReportActivities } from "@/services/report-activities.service";
import { listProjectCounterparts } from "@/services/project-schedule.service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

function formatDate(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function text(v: unknown, fb = ""): string {
  const s = String(v ?? "").trim();
  return s.length ? s : fb;
}

/** Aplica largura de coluna automática (limitada) a partir do conteúdo. */
function autoWidth(rows: unknown[][]): { wch: number }[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? "").length;
      widths[i] = Math.max(widths[i] ?? 10, Math.min(len + 2, 60));
    });
  }
  return widths.map((w) => ({ wch: w }));
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: unknown[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = autoWidth(rows);
  // Nome de aba no Excel: máx. 31 caracteres e sem : \ / ? * [ ]
  const safeName = name.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeName);
}

function sanitizeFileName(value: string) {
  // Remove marcas de acentuação combinantes (U+0300–U+036F) por code point,
  // evitando caracteres não-ASCII no código-fonte.
  const noAccents = value
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join("");

  return noAccents
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser();
  const reportId = params.id;

  const detail = await getReportDetail(reportId, user.id).catch(() => null);
  if (!detail?.report) {
    return new Response("Relatório não encontrado.", { status: 404 });
  }

  const { report, currentVersion } = detail;

  const projectFull = await getProjectByIdForUser(report.project_id, user.id);
  if (!projectFull) {
    return new Response("Acesso negado ao projeto.", { status: 403 });
  }

  const { getOrganizationByIdForUser } = await import(
    "@/services/organizations.service"
  );

  const isIncentivado =
    String((projectFull as any).project_type ?? "").toUpperCase() ===
    "INCENTIVADO";

  const [organization, financialData, activities, templateData, counterparts] =
    await Promise.all([
      getOrganizationByIdForUser((projectFull as any).organization_id).catch(
        () => null,
      ),
      getReportFinancialData(reportId),
      listReportActivities(reportId).catch(() => []),
      getReportTemplateForProjectType(
        (projectFull as any).project_type,
      ).catch(() => null),
      isIncentivado
        ? listProjectCounterparts(String(report.project_id)).catch(() => [])
        : Promise.resolve([]),
    ]);

  let counterpartReviews: {
    counterpart_id: string;
    execution: string | null;
    comment: string | null;
  }[] = [];
  if (isIncentivado && counterparts.length > 0) {
    const supabaseRev = createClient();
    const { data: revData } = await (supabaseRev as any)
      .from("report_counterpart_reviews")
      .select("counterpart_id, execution, comment")
      .eq("report_id", reportId);
    counterpartReviews = revData ?? [];
  }
  const reviewByCounterpart = new Map(
    counterpartReviews.map((r) => [r.counterpart_id, r]),
  );

  const p = projectFull as any;
  const data = (currentVersion?.data as any) ?? {};
  const { items, summary, reallocations, receipts, bankStatements } =
    financialData;

  const orgName =
    (organization as any)?.name ?? (organization as any)?.legal_name ?? "-";
  const projectTitle = p.title ?? p.name ?? "Projeto";
  const audiences: string[] = Array.isArray(p.target_audience)
    ? p.target_audience
    : [];

  const wb = XLSX.utils.book_new();

  // ── Dados do Projeto ──
  addSheet(wb, "Dados do Projeto", [
    ["Relatório de Atividades — Prestação de Contas"],
    [],
    ["Organização", text(orgName, "-")],
    ["Projeto", text(projectTitle, "-")],
    [
      "Período do Relatório",
      `${formatDate(report.period_start)} - ${formatDate(report.period_end)}`,
    ],
    [
      "Período total do apoio",
      `${formatDate(p.start_date ?? p.created_at)} - ${formatDate(p.end_date)}`,
    ],
    ["Orçamento Total", num(p.total_value)],
    ["UF do Projeto", text(p.state_uf, "-")],
    ["Área de Atuação", text(p.area_of_action, "-")],
    [
      "Qtd. de beneficiários",
      p.people_served != null ? num(p.people_served) : "-",
    ],
    ["Coordenador/Gerente", text(p.coordinator_name, "-")],
    [
      "Público-alvo",
      audiences.map((a) => TARGET_AUDIENCE_LABELS[a] ?? a).join(", ") || "-",
    ],
    ["Observações", text(p.observations, "-")],
    // Campos específicos por tipo (overview_data)
    ...(() => {
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
          ["publico_beneficiado", "Público beneficiado"],
          ["resultados_esperados", "Resultados esperados"],
          ["monitoramento", "Monitoramento e avaliação"],
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
      return (EXTRA_LABELS[typeKey] ?? [])
        .map(([k, l]) => [l, String(ov[k] ?? "").trim()] as const)
        .filter(([, v]) => v.length > 0)
        .map(([l, v]) => [l, v] as unknown[]);
    })(),
    [],
    ["Documento gerado em", formatDate(new Date().toISOString())],
  ]);

  // ── Contrapartidas (INCENTIVADO) ──
  if (isIncentivado) {
    addSheet(wb, "Contrapartidas", [
      ["Contrapartida", "Descrição", "Execução", "Comentário"],
      ...(counterparts.length
        ? counterparts.map((c) => {
            const review = reviewByCounterpart.get(c.id);
            return [
              text(c.title),
              text(c.description, "-"),
              text(review?.execution, "Não avaliada"),
              text(review?.comment, "-"),
            ];
          })
        : [["Nenhuma contrapartida pactuada.", "", "", ""]]),
    ]);
  }

  // ── Atividades ──
  addSheet(wb, "Atividades", [
    ["Mês", "Ano", "Atividade", "Execução", "Avaliação"],
    ...(activities.length
      ? activities.map((a) => [
          text(a.activity_month, "-"),
          a.activity_year ?? "-",
          text(a.activity),
          text(a.execution, "-"),
          text(a.evaluation, "-"),
        ])
      : [["Nenhuma atividade cadastrada.", "", "", "", ""]]),
  ]);

  // ── Financeiro ──
  addSheet(wb, "Financeiro", [
    [
      "Tipo",
      "Item",
      "Orçamento",
      "Gasto total",
      "Remanejado total",
      "Saldo anterior",
      "Gastos no período",
      "Remanej. no período",
      "Saldo atual",
    ],
    ...(items.length
      ? items.map((it) => [
          text(it.investment_type),
          text(it.item_description),
          num(it.budget_planned),
          num(it.total_spent),
          num(it.total_reallocated),
          num(it.previous_balance),
          num(it.period_expenses),
          num(it.period_realloc),
          num(it.current_balance),
        ])
      : [["Nenhum item financeiro cadastrado.", "", "", "", "", "", "", "", ""]]),
    [],
    ["Resumo financeiro (calculado automaticamente)"],
    ["Saldo Planejado", num(summary?.planned_balance)],
    ["Saldo anterior", num(summary?.previous_balance)],
    ["Repasse no período", num(summary?.period_transfer)],
    ["Gasto real", num(summary?.actual_expenses)],
    ["Saldo em conta", num(summary?.account_balance)],
  ]);

  // ── Remanejamento ──
  addSheet(wb, "Remanejamento", [
    [
      "Tipo Investimento",
      "Item",
      "Vl Previsto",
      "Novo Tipo",
      "Novo Item",
      "Vl Remanejado",
    ],
    ...(reallocations.length
      ? reallocations.map((r) => [
          text(r.original_type),
          text(r.original_item),
          num(r.original_value),
          text(r.new_type, "-"),
          text(r.new_item, "-"),
          num(r.reallocated_value),
        ])
      : [["Nenhum remanejamento cadastrado.", "", "", "", "", ""]]),
  ]);

  // ── Recibos ──
  addSheet(wb, "Recibos", [
    [
      "Item Planejamento",
      "Item da Nota",
      "Valor",
      "Número",
      "Data",
      "Remanejado?",
    ],
    ...(receipts.length
      ? receipts.map((r) => [
          text(r.planning_item),
          text(r.receipt_description),
          num(r.receipt_value),
          text(r.receipt_number, "-"),
          formatDate(r.receipt_date),
          r.is_reallocated ? "SIM" : "NÃO",
        ])
      : [["Nenhum recibo cadastrado.", "", "", "", "", ""]]),
  ]);

  // ── Extratos ──
  addSheet(wb, "Extratos", [
    ["Extrato", "Status", "Arquivo"],
    ...(bankStatements.length
      ? bankStatements.map((bs) => [
          text(bs.label, "-"),
          text(bs.status, "-"),
          text((bs as any).file_name, "-"),
        ])
      : [["Nenhum extrato bancário enviado.", "", ""]]),
  ]);

  // ── Conteúdo do relatório (template) ──
  const contentRows: unknown[][] = [["Seção", "Campo", "Resposta"]];
  const sections = (templateData?.sections as any[]) ?? [];
  if (sections.length) {
    for (const s of sections) {
      for (const f of s.fields ?? []) {
        contentRows.push([
          text(s.title, "Seção"),
          text(f.label ?? f.key),
          text(data?.[String(f.key)], "—"),
        ]);
      }
    }
  } else {
    contentRows.push(["Nenhum template ativo para este tipo de projeto.", "", ""]);
  }
  addSheet(wb, "Conteúdo", contentRows);

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const fileName = sanitizeFileName(
    `relatorio-${projectTitle}-${String(report.period_start ?? "").slice(0, 10)}`,
  );

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
