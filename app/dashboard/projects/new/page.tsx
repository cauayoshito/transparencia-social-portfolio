import Link from "next/link";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import NewProjectForm from "./NewProjectForm";
import { requireUser } from "@/services/auth.service";
import {
  getUserContext,
  getOrganizationMemberships,
} from "@/services/membership.service";
import { getActiveLinksForOrganizations } from "@/services/financier-organization-links.service";
import { getPrimaryRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { error?: string | string[] };
};

type ProjectType = "INCENTIVADO" | "RECURSOS_PUBLICOS" | "RECURSOS_PROPRIOS";

function readQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return null;
}

function encodeMsg(message: string) {
  return encodeURIComponent(message);
}

function normalizeProjectType(raw: string): ProjectType {
  const n = String(raw ?? "").trim().toUpperCase();
  if (n === "INCENTIVADO") return "INCENTIVADO";
  if (n === "RECURSOS_PUBLICOS") return "RECURSOS_PUBLICOS";
  if (n === "RECURSOS_PROPRIOS") return "RECURSOS_PROPRIOS";
  return "INCENTIVADO";
}

function normalizeRole(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function roleLabel(value: string | null | undefined) {
  const n = normalizeRole(value);
  if (n === "ORG_ADMIN") return "Administrador";
  if (n === "ORG_MEMBER") return "Membro";
  return "Vínculo";
}

function getInitialMetadataByProjectType(projectType: ProjectType) {
  const base = {
    model_version: 1,
    project_type: projectType,
    identification: {
      responsible_name: "",
      responsible_email: "",
      responsible_phone: "",
      start_date: "",
      end_date: "",
      city: "",
      state: "",
    },
    objectives: {
      general_objective: "",
      specific_objectives: [],
      target_audience: "",
      expected_beneficiaries: null,
    },
    goals_and_deliveries: {
      goals: [],
      indicators: [],
      expected_results: "",
    },
    schedule: {
      stages: [],
      milestones: [],
      reporting_frequency: "",
    },
    financial: {
      total_value: null,
      executed_value: null,
      remaining_value: null,
      categories: [],
      notes: "",
    },
    accountability: {
      qualitative_report: "",
      evidence_notes: "",
      attachments_expected: [],
      photos_expected: false,
    },
    documents: {
      required: [],
      optional: [],
    },
  };

  if (projectType === "INCENTIVADO") {
    return {
      ...base,
      legal_framework: {
        incentive_law: "",
        pronac: "",
        approval_publication: "",
        sponsor: "",
        counterparties: [],
      },
      schedule: { ...base.schedule, reporting_frequency: "mensal" },
      accountability: {
        ...base.accountability,
        photos_expected: true,
        attachments_expected: [
          "relatorio_qualitativo",
          "registro_fotografico",
          "comprovantes_financeiros",
        ],
      },
      documents: {
        required: [
          "documentacao_institucional",
          "aprovacao_do_projeto",
          "comprovantes_financeiros",
        ],
        optional: ["materiais_complementares"],
      },
    };
  }

  if (projectType === "RECURSOS_PUBLICOS") {
    return {
      ...base,
      public_funding: {
        public_notice: "",
        agreement_number: "",
        government_agency: "",
        work_plan_reference: "",
        accountability_deadline: "",
      },
      schedule: { ...base.schedule, reporting_frequency: "mensal" },
      accountability: {
        ...base.accountability,
        photos_expected: true,
        attachments_expected: [
          "plano_de_trabalho",
          "extratos",
          "comprovantes_financeiros",
          "relatorio_de_execucao",
        ],
      },
      documents: {
        required: [
          "termo_ou_convenio",
          "plano_de_trabalho",
          "certidoes",
          "extratos",
          "comprovantes_financeiros",
        ],
        optional: ["anexos_complementares"],
      },
    };
  }

  return {
    ...base,
    own_resources: {
      funding_source: "",
      internal_budget_reference: "",
      internal_approval: "",
      main_investor: "",
    },
    schedule: { ...base.schedule, reporting_frequency: "mensal" },
    accountability: {
      ...base.accountability,
      photos_expected: true,
      attachments_expected: [
        "relatorio_qualitativo",
        "extratos",
        "comprovantes_financeiros",
      ],
    },
    documents: {
      required: [
        "documentacao_institucional",
        "comprovantes_financeiros",
        "extratos",
      ],
      optional: ["anexos_complementares"],
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Server action inline — cria o projeto
// ─────────────────────────────────────────────────────────────────
async function createProjectAction(formData: FormData) {
  "use server";

  const user = await requireUser();

  try {
    const [ctx, memberships] = await Promise.all([
      getUserContext(user.id),
      getOrganizationMemberships(user.id),
    ]);

    const userRole = getPrimaryRole(ctx);
    const organizationId = String(formData.get("organization_id") ?? "").trim();

    if (userRole !== "ORG") {
      redirect(
        `/dashboard/projects?error=${encodeMsg("Apenas organizações sociais podem criar projetos.")}`
      );
    }

    const membership = memberships.find(
      (m) => m.organization_id === organizationId
    );

    if (normalizeRole(membership?.role) !== "ORG_ADMIN") {
      redirect(
        `/dashboard/projects?error=${encodeMsg("Apenas administradores da organização podem criar projetos.")}`
      );
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    redirect(
      `/dashboard/projects?error=${encodeMsg("Não foi possível validar suas permissões.")}`
    );
  }

  const title = String(formData.get("title") ?? "").trim();
  const projectType = normalizeProjectType(
    String(formData.get("project_type") ?? "")
  );
  const description = String(formData.get("description") ?? "").trim();
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const financierLinkId = String(formData.get("financier_link_id") ?? "").trim();

  if (!title) {
    redirect(`/dashboard/projects/new?error=${encodeMsg("Informe o nome do projeto.")}`);
  }
  if (!organizationId) {
    redirect(
      `/dashboard/projects/new?error=${encodeMsg("Organização não selecionada.")}`
    );
  }
  if (!financierLinkId) {
    redirect(
      `/dashboard/projects/new?error=${encodeMsg("Selecione um financiador ativo da organização.")}`
    );
  }

  // Validar o link server-side e resolver investor_id
  const db = createClient() as any;
  const { data: linkRow, error: linkErr } = await db
    .from("organization_investor_links")
    .select("investor_id, organization_id, status")
    .eq("id", financierLinkId)
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (linkErr || !linkRow) {
    redirect(
      `/dashboard/projects/new?error=${encodeMsg("Vínculo com financiador inativo ou inválido.")}`
    );
  }

  const investorId = linkRow.investor_id as string;

  try {
    // Usar phi_create_project RPC — já aceita investor_id diretamente
    // sem necessidade de linked_entity_id (campo legado)
    const { data: projectId, error: rpcErr } = await db.rpc(
      "phi_create_project",
      {
        p_user_id: user.id,
        p_org_id: organizationId,
        p_investor_id: investorId,
        p_title: title,
        p_description: description || null,
        p_project_type: projectType,
      }
    );

    if (rpcErr || !projectId) {
      throw new Error(
        rpcErr?.message ?? "phi_create_project não retornou um ID válido."
      );
    }

    // Vincular criador como OWNER em project_memberships
    await db.from("project_memberships").upsert(
      {
        project_id: projectId,
        user_id: user.id,
        role: "OWNER",
        created_by: user.id,
      },
      { onConflict: "project_id,user_id" }
    );

    redirect(`/dashboard/projects/${projectId}?tab=overview`);
  } catch (e) {
    if (isRedirectError(e)) throw e;

    const message =
      e instanceof Error && e.message
        ? e.message
        : "Não foi possível criar o projeto. Tente novamente.";

    redirect(`/dashboard/projects/new?error=${encodeMsg(message)}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────
export default async function NewProjectPage({ searchParams }: Props) {
  const user = await requireUser();

  let role: ReturnType<typeof getPrimaryRole> = "ORG";
  try {
    const ctx = await getUserContext(user.id);
    role = getPrimaryRole(ctx);
  } catch {
    // fallback ORG
  }

  if (role !== "ORG") {
    redirect(
      `/dashboard/projects?error=${encodeMsg("Apenas organizações sociais podem criar projetos.")}`
    );
  }

  const memberships = await getOrganizationMemberships(user.id);
  const adminMemberships = memberships.filter(
    (m) => normalizeRole(m.role) === "ORG_ADMIN"
  );

  if (adminMemberships.length === 0) {
    redirect(
      `/dashboard/projects?error=${encodeMsg("Apenas administradores da organização podem criar projetos.")}`
    );
  }

  const errorMessage = readQueryValue(searchParams?.error);

  const organizationIds = adminMemberships
    .map((m) => m.organization_id)
    .filter(Boolean) as string[];

  // Busca vínculos ativos (financiadores que convidaram estas orgs)
  const activeLinks =
    organizationIds.length > 0
      ? await getActiveLinksForOrganizations(organizationIds)
      : [];

  const hasOrganizations = adminMemberships.length > 0;
  const hasLinks = activeLinks.length > 0;

  const defaultOrgId = adminMemberships[0]?.organization_id ?? "";

  const organizationOptions = adminMemberships.map((m) => ({
    id: m.organization_id,
    label:
      (m.organization?.name ?? "Organização sem nome") +
      " — " +
      roleLabel(m.role),
  }));

  const financierLinkOptions = activeLinks.map((link) => ({
    id: link.id,
    investor_id: link.investor_id,
    investor_name: link.investor_name,
    organization_id: link.organization_id,
    is_legacy: link.is_legacy,
  }));

  return (
    <main className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Novo projeto
          </h1>
          <p className="text-sm text-slate-600">
            Escolha o modelo do projeto e selecione o financiador que ficará
            vinculado a ele desde a criação.
          </p>
        </div>

        <Link
          href="/dashboard/projects"
          className="text-sm text-blue-600 hover:underline"
        >
          Voltar
        </Link>
      </header>

      {errorMessage && errorMessage !== "NEXT_REDIRECT" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {!hasOrganizations && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Você ainda não tem vínculo administrativo com uma organização. Peça
          acesso a um administrador.
        </div>
      )}

      {hasOrganizations && !hasLinks && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Sua organização ainda não tem nenhum financiador ativo. Aguarde o
          convite de um financiador antes de criar projetos.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Incentivos Fiscais</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Projetos aprovados em uma das leis de incentivo fiscal.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Recursos Públicos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Projetos celebrados com o poder público.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Recursos Próprios</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Projetos que buscam apoio financeiro de empresas.
          </p>
        </div>
      </section>

      <NewProjectForm
        action={createProjectAction}
        organizations={organizationOptions}
        financierLinks={financierLinkOptions}
        defaultOrganizationId={defaultOrgId}
        canSubmit={hasOrganizations && hasLinks}
      />
    </main>
  );
}
