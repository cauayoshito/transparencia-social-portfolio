import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole } from "@/lib/roles";
import InviteMemberButton from "@/components/organizations/InviteMemberButton";
import {
  getOrganizationByIdForUser,
  getProfileById,
  listOrganizationMembers,
} from "@/services/organizations.service";
import { getQuestionnaireByOrgId } from "@/services/organization_questionnaire.service";
import { updateOrganizationAction } from "@/app/actions/organizations.actions";
import { uploadOrganizationLogoAction } from "@/app/actions/organization-logo.actions";
import { upsertOrganizationQuestionnaireAction } from "@/app/actions/organization-questionnaire.actions";
import Image from "next/image";

export const dynamic = "force-dynamic";

function msg(v?: string | string[]) {
  return typeof v === "string" ? decodeURIComponent(v) : null;
}

function normalizeErrorMessage(v?: string | string[]) {
  const value = msg(v);
  if (!value) return null;
  if (value === "NEXT_REDIRECT" || value.includes("NEXT_REDIRECT")) return null;
  return value;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(d);
}

function shortId(value?: string | null) {
  const s = String(value ?? "").trim();
  if (!s) return "—";
  if (s.length <= 16) return s;
  return `${s.slice(0, 8)}...${s.slice(-4)}`;
}

function roleLabel(value?: string | null) {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();

  if (v === "ORG_ADMIN") return "Administrador";
  if (v === "ORG_MEMBER") return "Membro";

  return "Vínculo ativo";
}

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string | string[]; success?: string | string[] };
}) {
  const orgId = params.id;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6">
        <p>Sem sessão. Faça login.</p>
        <Link className="underline" href="/login">
          Ir para login
        </Link>
      </div>
    );
  }

  // P1.6: Resolver perfil — INVESTOR/CONSULTANT = somente leitura
  let canEdit = true;
  let viewerLabel = "";
  try {
    const ctx = await getUserContext(user.id);
    const role = getPrimaryRole(ctx);
    canEdit = role === "ORG";
    if (role === "INVESTOR") viewerLabel = "financiador";
    if (role === "CONSULTANT") viewerLabel = "consultor";
  } catch {
    // fallback: permite edição (ORG)
  }

  const [org, q, members] = await Promise.all([
    getOrganizationByIdForUser(orgId),
    getQuestionnaireByOrgId(orgId),
    listOrganizationMembers(orgId),
  ]);

  const updatedByProfile = org.updated_by
    ? await getProfileById(org.updated_by).catch(() => null)
    : null;

  let logoUrl: string | null = null;

  if (org.logo_path) {
    try {
      const { data, error } = await supabase.storage
        .from("organization-logos")
        .createSignedUrl(org.logo_path, 300);

      if (!error) logoUrl = data?.signedUrl ?? null;
    } catch {
      logoUrl = null;
    }
  }

  const error = normalizeErrorMessage(searchParams?.error);
  const success = msg(searchParams?.success);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {org.name || "Organização"}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              ID {shortId(org.id)}
            </span>

            {org.document ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                {org.tax_id_type ?? "Documento"}: {org.document}
              </span>
            ) : null}
          </div>

          {updatedByProfile && org.updated_at ? (
            <p className="mt-3 text-sm text-slate-600">
              Última alteração por{" "}
              <span className="font-medium">
                {updatedByProfile.full_name ??
                  updatedByProfile.email ??
                  "Usuário"}
              </span>{" "}
              em {formatDate(org.updated_at)}.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <InviteMemberButton
              organizationId={orgId}
              organizationName={org.name}
            />
          )}

          <Link
            className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            href={`/dashboard/organizations/${orgId}/documents`}
          >
            Documentos da organização
          </Link>
        </div>
      </header>

      {!canEdit && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Você está visualizando esta organização como{" "}
          <span className="font-semibold">{viewerLabel}</span>. Os dados são
          somente leitura.
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <form
          action={canEdit ? updateOrganizationAction : undefined}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <fieldset
            disabled={!canEdit}
            className={!canEdit ? "opacity-80" : ""}
          >
            <input type="hidden" name="orgId" value={orgId} />

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Dados da organização
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {canEdit
                  ? "Atualize informações institucionais e dados de contato."
                  : "Informações institucionais e dados de contato."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                Nome da organização
                <input
                  name="name"
                  defaultValue={org.name ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Responsável pela organização
                <select
                  name="responsible_user_id"
                  defaultValue={org.responsible_user_id ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                >
                  <option value="">—</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name ?? m.email ?? shortId(m.user_id)} •{" "}
                      {roleLabel(m.role)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-1 text-sm">
                  Tipo
                  <select
                    name="tax_id_type"
                    defaultValue={org.tax_id_type ?? "CNPJ"}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                  </select>
                </label>

                <label className="col-span-2 text-sm">
                  CNPJ/CPF
                  <input
                    name="tax_id"
                    defaultValue={org.document ?? ""}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                  />
                </label>
              </div>

              <label className="text-sm">
                Razão social
                <input
                  name="legal_name"
                  defaultValue={org.legal_name ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Data de fundação
                <input
                  name="foundation_date"
                  type="date"
                  defaultValue={org.foundation_date ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Perfil
                <input
                  name="profile_type"
                  defaultValue={org.profile_type ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Outros: especifique
                <input
                  name="profile_other"
                  defaultValue={org.profile_other ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                E-mail
                <input
                  name="email"
                  defaultValue={org.email ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Facebook
                <input
                  name="facebook"
                  defaultValue={org.facebook ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Instagram
                <input
                  name="instagram"
                  defaultValue={org.instagram ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Site
                <input
                  name="site"
                  defaultValue={org.site ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                LinkedIn
                <input
                  name="linkedin"
                  defaultValue={org.linkedin ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Banco
                <input
                  name="bank_name"
                  defaultValue={org.bank_name ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Agência
                <input
                  name="bank_agency"
                  defaultValue={org.bank_agency ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm">
                Conta
                <input
                  name="bank_account"
                  defaultValue={org.bank_account ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>

              <label className="text-sm md:col-span-2">
                Chave PIX
                <input
                  name="pix_key"
                  defaultValue={org.pix_key ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>
            </div>
          </fieldset>

          {canEdit && (
            <button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              Salvar dados
            </button>
          )}
        </form>

        <div className="space-y-6">
          {canEdit ? (
            <form
              action={uploadOrganizationLogoAction}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <input type="hidden" name="orgId" value={orgId} />

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Logo da organização
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Envie uma imagem para representar a organização no sistema.
                </p>
              </div>

              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={112}
                  height={112}
                  className="h-28 w-28 rounded-lg border border-slate-200 bg-white object-contain"
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  Nenhuma logo enviada.
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  name="logo"
                  accept="image/*"
                  className="block text-sm"
                />
                <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                  Enviar logo
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Logo da organização
              </h2>
              <div className="mt-3">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={112}
                    height={112}
                    className="h-28 w-28 rounded-lg border border-slate-200 bg-white object-contain"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                    Nenhuma logo cadastrada.
                  </div>
                )}
              </div>
            </div>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Membros vinculados
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Pessoas com acesso à organização.
                </p>
              </div>

              {canEdit && (
                <InviteMemberButton
                  organizationId={orgId}
                  organizationName={org.name}
                />
              )}
            </div>

            <div className="mt-4 space-y-3">
              {members.length === 0 ? (
                <div className="text-sm text-slate-500">
                  Nenhum membro encontrado.
                </div>
              ) : (
                members.map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {m.full_name ?? "Usuário sem nome"}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {m.email ?? shortId(m.user_id)}
                      </div>
                    </div>

                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {roleLabel(m.role)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      <form
        action={canEdit ? upsertOrganizationQuestionnaireAction : undefined}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <fieldset disabled={!canEdit} className={!canEdit ? "opacity-80" : ""}>
          <input type="hidden" name="orgId" value={orgId} />

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Questionário
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Informações institucionais e dados complementares da organização.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm">
              Liderança - Nome
              <input
                name="leader_name"
                defaultValue={q?.leader_name ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm">
              Liderança - Celular
              <input
                name="leader_phone"
                defaultValue={q?.leader_phone ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm md:col-span-2">
              Liderança - E-mail
              <input
                name="leader_email"
                defaultValue={q?.leader_email ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm">
              Gênero
              <input
                name="leader_gender"
                defaultValue={q?.leader_gender ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                placeholder="Ex: Feminino, Masculino, Não informar..."
              />
            </label>

            <label className="text-sm">
              Se outros, informar
              <input
                name="leader_gender_other"
                defaultValue={q?.leader_gender_other ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm md:col-span-2">
              Cor/Raça (IBGE)
              <input
                name="leader_race"
                defaultValue={q?.leader_race ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                placeholder="Informe conforme necessário"
              />
            </label>

            <label className="text-sm">
              Ocupa cargo público?
              <input
                name="legal_rep_has_public_office"
                defaultValue={q?.legal_rep_has_public_office ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                placeholder="Não / Sim / Não respondeu"
              />
            </label>

            <label className="text-sm">
              Caso tenha, cargo e ano
              <input
                name="legal_rep_public_office_details"
                defaultValue={q?.legal_rep_public_office_details ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm">
              Se candidatou a cargo político?
              <input
                name="legal_rep_ran_for_political_office"
                defaultValue={q?.legal_rep_ran_for_political_office ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                placeholder="Não / Sim / Não respondeu"
              />
            </label>

            <label className="text-sm">
              Caso tenha, cargo e ano
              <input
                name="legal_rep_political_office_details"
                defaultValue={q?.legal_rep_political_office_details ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm md:col-span-2">
              Declaração (inquérito/processo/condenação)
              <input
                name="legal_rep_criminal_declaration"
                defaultValue={q?.legal_rep_criminal_declaration ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                placeholder="Não / Sim / Não respondeu"
              />
            </label>

            <div className="md:col-span-2 border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900">
                Responsável pelo preenchimento
              </h3>
            </div>

            <label className="text-sm">
              Nome
              <input
                name="filled_by_name"
                defaultValue={q?.filled_by_name ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm">
              Celular
              <input
                name="filled_by_phone"
                defaultValue={q?.filled_by_phone ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm md:col-span-2">
              E-mail
              <input
                name="filled_by_email"
                defaultValue={q?.filled_by_email ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <div className="md:col-span-2 border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900">
                Histórico de editais/curadorias
              </h3>
            </div>

            <label className="text-sm">
              Data
              <input
                name="edital_date"
                type="date"
                defaultValue={q?.edital_date ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="text-sm">
              Código
              <input
                name="edital_code"
                defaultValue={q?.edital_code ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                placeholder="Código ou referência"
              />
            </label>

            <label className="text-sm md:col-span-2">
              Texto
              <textarea
                name="edital_text"
                defaultValue={q?.edital_text ?? ""}
                className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2.5"
              />
            </label>
          </div>
        </fieldset>

        {canEdit && (
          <button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
            Salvar questionário
          </button>
        )}
      </form>
    </main>
  );
}
