import Link from "next/link";
import { notFound } from "next/navigation";

import { changeProjectStatusAction } from "@/app/actions/project-status.actions";
import { autosaveProjectPlanAction } from "@/app/actions/project-plan.actions";

import { isConsultant } from "@/lib/permissions";
import { getPrimaryRole } from "@/lib/roles";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/status";

import { requireUser } from "@/services/auth.service";
import {
  getUserContext,
  getOrganizationMemberships,
  getInvestorMemberships,
} from "@/services/membership.service";
import {
  getProjectByIdForUser,
  listProjectParticipants,
  listAvailableConsultantsForProject,
} from "@/services/projects.service";
import { listProjectReportAttachments } from "@/services/reports.service";
import { getProjectFinancialAggregation } from "@/services/report-financial.service";
import { getProjectBudgetSnapshot } from "@/services/project-budget.service";
import { listOrganizationMembers } from "@/services/organizations.service";

import ProjectOverview from "@/components/projects/ProjectOverview";
import ProjectPlan from "@/components/projects/ProjectPlan";
import ProjectFinancial from "@/components/projects/ProjectFinancial";
import ProjectDocuments from "@/components/projects/ProjectDocuments";
import ProjectParticipants from "@/components/projects/ProjectParticipants";
import UnsavedChangesGuard from "@/components/projects/UnsavedChangesGuard";
import AssignConsultant from "@/components/projects/AssignConsultant";

export const dynamic = "force-dynamic";

const tabs = [
  { key: "overview", label: "Visão geral" },
  { key: "plan", label: "Plano" },
  { key: "financial", label: "Financeiro" },
  { key: "participants", label: "Participantes" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

type Props = {
  params: { id: string };
  searchParams?: {
    tab?: string;
    error?: string | string[];
    success?: string | string[];
  };
};

function toProjectStatus(value: unknown): ProjectStatus {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    v === "DRAFT" ||
    v === "ENVIADO" ||
    v === "EM_ANALISE" ||
    v === "APROVADO" ||
    v === "DEVOLVIDO"
  ) {
    return v;
  }

  return "DRAFT";
}

function readQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return null;
}

function normalizeRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function isTabKey(value: string): value is TabKey {
  return tabs.some((tab) => tab.key === value);
}

function readTab(value: string | string[] | undefined): TabKey {
  const tab = readQueryValue(value);
  return tab && isTabKey(tab) ? tab : "overview";
}

function buildTabHref(projectId: string, tab: TabKey) {
  return `/dashboard/projects/${projectId}?tab=${tab}`;
}

function projectTypeLabel(value: unknown) {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();

  if (v === "INCENTIVADO") return "Incentivos Fiscais";
  if (v === "RECURSOS_PUBLICOS") return "Recursos Públicos";
  if (v === "RECURSOS_PROPRIOS") return "Recursos Próprios";
  return String(value ?? "-");
}

function buildStatusNote(
  status: ProjectStatus,
  isOrgUser: boolean,
  consultant: boolean,
) {
  if (status === "APROVADO") {
    return "Este projeto já foi aprovado. Nenhuma ação adicional está disponível nesta etapa.";
  }

  if (status === "DRAFT") {
    return isOrgUser
      ? "Revise as informações do projeto e envie para análise quando estiver pronto."
      : "O projeto ainda está em rascunho e aguarda envio pela organização.";
  }

  if (status === "ENVIADO") {
    return consultant
      ? "Este projeto está pronto para análise."
      : "O projeto foi enviado e aguarda início da análise.";
  }

  if (status === "EM_ANALISE") {
    return "O projeto está em análise no momento.";
  }

  return isOrgUser
    ? "O projeto foi devolvido para ajustes. Revise as informações e reenvie quando estiver pronto."
    : "O projeto foi devolvido para ajustes e aguarda atualização da organização.";
}

export default async function DashboardProjectDetailPage({
  params,
  searchParams,
}: Props) {
  const user = (await requireUser()) as any;
  const safeUserId = user?.id ?? user?.user?.id;

  if (!safeUserId) {
    notFound();
  }

  const [ctx, rawProject] = await Promise.all([
    getUserContext(safeUserId),
    getProjectByIdForUser(params.id, safeUserId),
  ]);

  if (!rawProject) notFound();

  const project = rawProject;

  const { getOrganizationByIdForUser } = await import("@/services/organizations.service");

  const [organizationMembers, participants, orgMemberships, reportAttachments, organization, projectFinancialData, projectBudget] =
    await Promise.all([
      listOrganizationMembers(project.organization_id),
      listProjectParticipants(project.id),
      getOrganizationMemberships(safeUserId),
      listProjectReportAttachments(project.id, safeUserId).catch(() => ({
        receipts: [],
        bankStatements: [],
        others: [],
      })),
      getOrganizationByIdForUser(project.organization_id).catch(() => null),
      getProjectFinancialAggregation(String(project.id)).catch(() => ({
        items: [],
        receipts: [],
        bankStatements: [],
        totals: { total_budget_planned: 0, total_spent: 0, total_receipts_value: 0, total_bank_statements: 0, total_items: 0 },
      })),
      getProjectBudgetSnapshot(String(project.id)).catch(() => ({
        items: [],
        transfers: [],
        totals: { total_planned: 0, total_transfers_planned: 0, total_transfers_realized: 0 },
      })),
    ]);

  const status = toProjectStatus(project.status);

  const projectTitle =
    (project as any).title ??
    (project as any).name ??
    (project as any).project_name ??
    "Projeto";

  const projectType =
    (project as any).project_type ??
    (project as any).type ??
    (project as any).projectType ??
    "-";

  const consultant = isConsultant(ctx);
  const role = getPrimaryRole(ctx);
  const isOrgUser = role === "ORG";
  const isInvestor = role === "INVESTOR";

  // Resolve analyst name if project has analyst_user_id
  let analystName: string | null = null;
  const analystId = (project as any).analyst_user_id;
  if (analystId) {
    const analystParticipant = participants.find((p) => p.user_id === analystId);
    analystName = analystParticipant?.full_name ?? null;
  }
  const organizationName = (organization as any)?.name ?? (organization as any)?.legal_name ?? null;

  // P2.1: INVESTOR/CONSULTANT = somente leitura (vê dados, não edita)
  const isReadOnly = !isOrgUser;

  const isLockedForOrg =
    isOrgUser &&
    (status === "ENVIADO" || status === "EM_ANALISE" || status === "APROVADO");

  const canEditProjectContent =
    isOrgUser && (status === "DRAFT" || status === "DEVOLVIDO");

  // P0: Consultor pode iniciar análise (ENVIADO → EM_ANALISE), mas NÃO pode aprovar/devolver
  const canStartReview = status === "ENVIADO" && (consultant || isInvestor);
  const canResubmit = status === "DEVOLVIDO" && isOrgUser;
  const canSubmit = status === "DRAFT" && isOrgUser;
  // P0: Somente INVESTOR pode aprovar/devolver projeto. Consultor pode apenas recomendar.
  const canReview = status === "EM_ANALISE" && isInvestor;
  const canRecommendProject = status === "EM_ANALISE" && consultant;

  // P0: Investidor pode atribuir consultores
  let availableConsultants: Array<{ user_id: string; full_name: string | null; email: string | null }> = [];
  if (isInvestor) {
    try {
      const investorMemberships = await getInvestorMemberships(safeUserId);
      if (investorMemberships.length > 0) {
        availableConsultants = await listAvailableConsultantsForProject(
          investorMemberships[0].investor_id,
          String(project.id),
        );
      }
    } catch {
      // Silently fail — UI will just not show the assignment form
    }
  }

  const assignedConsultants = participants
    .filter((p) => normalizeRole(p.role) === "CONSULTANT")
    .map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
    }));

  const currentParticipant = participants.find(
    (participant) => participant.user_id === safeUserId,
  );

  const isProjectOwner = normalizeRole(currentParticipant?.role) === "OWNER";

  const currentOrgMembership = orgMemberships.find(
    (membership) => membership.organization_id === project.organization_id,
  );

  const isOrgAdmin = normalizeRole(currentOrgMembership?.role) === "ORG_ADMIN";

  const canManageParticipants = isProjectOwner || isOrgAdmin;
  const canEditParticipants =
    canManageParticipants && canEditProjectContent && !isReadOnly;

  const errorMessage = readQueryValue(searchParams?.error);
  const successMessage = readQueryValue(searchParams?.success);
  const tab = readTab(searchParams?.tab);
  const hasStatusActions =
    canSubmit || canStartReview || canReview || canResubmit || canRecommendProject;
  const statusNote = buildStatusNote(status, isOrgUser, consultant);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            {projectTitle}
          </h1>

          <p className="break-words text-sm text-slate-600">
            Tipo: {projectTypeLabel(projectType)}
          </p>

          <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {PROJECT_STATUS_LABEL[status]}
          </span>
        </div>

        <Link
          href="/dashboard/projects"
          className="inline-flex min-h-10 items-center text-sm font-medium text-blue-600 hover:underline"
        >
          Voltar para projetos
        </Link>
      </header>

      {errorMessage && (
        <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Você está visualizando este projeto como{" "}
          <span className="font-semibold">
            {role === "INVESTOR" ? "financiador" : "consultor"}
          </span>
          . Os dados são somente leitura.
        </div>
      )}

      <section className="space-y-4 rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">
          Status do projeto
        </h2>
        <p className="text-sm text-slate-600">
          Acompanhe o andamento do projeto e execute as próximas ações quando
          estiverem disponíveis.
        </p>

        {canSubmit && (
          <form action={changeProjectStatusAction} className="w-full">
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="next_status" value="ENVIADO" />

            <button className="inline-flex min-h-11 w-full items-center justify-center rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 sm:w-auto">
              Enviar para análise
            </button>
          </form>
        )}

        {canStartReview && (
          <form action={changeProjectStatusAction} className="w-full">
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="next_status" value="EM_ANALISE" />

            <button className="inline-flex min-h-11 w-full items-center justify-center rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 sm:w-auto">
              Iniciar análise
            </button>
          </form>
        )}

        {canReview && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <form action={changeProjectStatusAction}>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="next_status" value="APROVADO" />

              <button className="min-h-11 w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                Aprovar
              </button>
            </form>

            <form action={changeProjectStatusAction} className="grid gap-2">
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="next_status" value="DEVOLVIDO" />

              <input
                name="reason"
                placeholder="Explique o motivo da devolução"
                className="min-h-11 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
                required
              />

              <button className="min-h-11 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700">
                Devolver
              </button>
            </form>
          </div>
        )}

        {canRecommendProject && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
            <p className="mb-2 font-medium">
              Este projeto está em análise. Como consultor, você pode acompanhar
              e emitir observações. A decisão final (aprovar ou devolver) é do
              financiador.
            </p>
          </div>
        )}

        {canResubmit && (
          <form action={changeProjectStatusAction} className="w-full">
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="next_status" value="ENVIADO" />

            <button className="inline-flex min-h-11 w-full items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto">
              Reenviar
            </button>
          </form>
        )}

        {isLockedForOrg && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Projeto enviado para análise. A edição do conteúdo e dos
            participantes está temporariamente bloqueada até nova devolução ou
            conclusão da análise.
          </div>
        )}

        {!hasStatusActions && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {statusNote}
          </div>
        )}
      </section>

      <nav className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-4 pb-2 text-sm">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={buildTabHref(String(project.id), item.key)}
              className={
                tab === item.key
                  ? "whitespace-nowrap font-semibold text-slate-900"
                  : "whitespace-nowrap text-slate-500 hover:text-slate-900"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <UnsavedChangesGuard autosaveAction={autosaveProjectPlanAction}>
        <div className="min-w-0">
          {tab === "overview" && (
            <div className="space-y-6">
              <ProjectOverview
                project={project as any}
                organizationName={organizationName}
                analystName={analystName}
              />

              {/* P0: Investidor pode atribuir/remover consultores */}
              {isInvestor && (
                <AssignConsultant
                  projectId={String(project.id)}
                  availableConsultants={availableConsultants}
                  assignedConsultants={assignedConsultants}
                />
              )}

              {/* Documentos institucionais — seção compacta dentro de Visão geral */}
              {isLockedForOrg ? (
                <div className="pointer-events-none select-none opacity-90">
                  <ProjectDocuments
                    projectId={String(project.id)}
                    projectType={String(projectType)}
                  />
                </div>
              ) : isReadOnly ? (
                <div className="pointer-events-none select-none opacity-90">
                  <ProjectDocuments
                    projectId={String(project.id)}
                    projectType={String(projectType)}
                  />
                </div>
              ) : (
                <ProjectDocuments
                  projectId={String(project.id)}
                  projectType={String(projectType)}
                />
              )}
            </div>
          )}

          {tab === "plan" &&
            (isLockedForOrg ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Este projeto está em análise. Os dados abaixo são somente
                  leitura até nova devolução.
                </div>
                <div className="pointer-events-none select-none opacity-90">
                  <ProjectPlan project={project as any} />
                </div>
              </div>
            ) : isReadOnly ? (
              <div className="pointer-events-none select-none opacity-90">
                <ProjectPlan project={project as any} />
              </div>
            ) : (
              <ProjectPlan project={project as any} />
            ))}

          {tab === "financial" && (
            <div className="space-y-4">
              {isLockedForOrg && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Este projeto está em análise. Os dados abaixo são somente
                  leitura até nova devolução.
                </div>
              )}
              <ProjectFinancial
                projectId={String(project.id)}
                role={role}
                canEdit={canEditProjectContent}
                budget={projectBudget as any}
                financialData={projectFinancialData as any}
                legacyReceipts={reportAttachments.receipts}
                legacyBankStatements={reportAttachments.bankStatements}
                legacyOthers={reportAttachments.others}
              />
            </div>
          )}

          {tab === "participants" && (
            <div className="space-y-6">
              {isInvestor && (
                <AssignConsultant
                  projectId={String(project.id)}
                  availableConsultants={availableConsultants}
                  assignedConsultants={assignedConsultants}
                />
              )}

              <ProjectParticipants
                projectId={String(project.id)}
                canManage={canEditParticipants}
                organizationMembers={organizationMembers as any[]}
                participants={participants as any[]}
              />
            </div>
          )}
        </div>
      </UnsavedChangesGuard>
    </main>
  );
}
