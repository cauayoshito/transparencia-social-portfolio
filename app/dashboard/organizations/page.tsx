import Link from "next/link";
import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getOrganizationMemberships } from "@/services/membership.service";
import { listOrganizationsForUser } from "@/services/organizations.service";
import { getPrimaryRole } from "@/lib/roles";
import { listInvitesForInvestor } from "@/services/financier-invites.service";
import {
  inviteOrganizationAction,
  revokeInviteAction,
  resendInviteAction,
} from "@/app/actions/financier-invites.actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { error?: string | string[]; success?: string | string[] };
};

function msg(v?: string | string[]) {
  return typeof v === "string" ? decodeURIComponent(v) : null;
}

function shortId(value?: string | null) {
  const s = String(value ?? "").trim();
  if (!s) return "-";
  if (s.length <= 16) return s;
  return `${s.slice(0, 8)}...${s.slice(-4)}`;
}

function membershipRoleLabel(value?: string | null) {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "ORG_ADMIN") return "Administrador";
  if (v === "ORG_MEMBER") return "Membro";
  return "Vínculo ativo";
}

function inviteStatusLabel(status: string) {
  if (status === "PENDING") return "Pendente";
  if (status === "ACTIVE") return "Aceito";
  if (status === "REVOKED") return "Revogado";
  if (status === "EXPIRED") return "Expirado";
  return status;
}

function inviteStatusClass(status: string) {
  if (status === "PENDING")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "ACTIVE")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REVOKED")
    return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default async function DashboardOrganizationsPage({ searchParams }: Props) {
  const user = await requireUser();

  const error = msg(searchParams?.error);
  const success = msg(searchParams?.success);

  let role: ReturnType<typeof getPrimaryRole> = "ORG";
  let investorId: string | undefined;
  try {
    const ctx = await getUserContext(user.id);
    role = getPrimaryRole(ctx);
    investorId = ctx.investorMembership?.investor_id;
  } catch {
    // fallback ORG
  }

  const memberships = await getOrganizationMemberships(user.id);
  const orgIds = (memberships ?? []).map((m) => m.organization_id);
  const orgs = orgIds.length > 0 ? await listOrganizationsForUser(orgIds) : [];

  const membershipMap = new Map(
    (memberships ?? []).map((m) => [m.organization_id, m.role])
  );

  // Para INVESTOR: buscar convites enviados (não-legados)
  const invites =
    role === "INVESTOR" && investorId
      ? await listInvitesForInvestor(investorId)
      : [];

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {role === "INVESTOR" ? "Organizações vinculadas" : "Minha Organização"}
          </h1>
          <p className="text-sm text-slate-600">
            {role === "INVESTOR"
              ? "Gerencie convites e organizações vinculadas à sua carteira."
              : role === "CONSULTANT"
              ? "Organizações dos projetos sob sua gestão."
              : "Gerencie os dados da sua organização."}
          </p>
        </div>

        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          Voltar
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 whitespace-pre-wrap break-all">
          {success}
        </div>
      )}

      {/* ── INVESTOR ─────────────────────────────────────────────── */}
      {role === "INVESTOR" && (
        <>
          {/* Formulário de convite */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold text-slate-900">Convidar organização</h2>
              <p className="mt-1 text-sm text-slate-600">
                Gere um link de aceite para que a organização crie sua conta
                já vinculada à sua carteira.
              </p>
            </div>

            <form action={inviteOrganizationAction} className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  E-mail da organização *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="contato@organizacao.org.br"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Nome sugerido (opcional)
                </label>
                <input
                  name="org_name"
                  placeholder="Ex: Instituto Comunidade Viva"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="sm:col-span-6">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Gerar convite
                </button>
              </div>
            </form>
          </section>

          {/* Convites enviados */}
          {invites.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Convites enviados</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {invites.length} convite{invites.length !== 1 ? "s" : ""} registrado{invites.length !== 1 ? "s" : ""}.
                </p>
              </div>

              <ul className="divide-y divide-slate-200">
                {invites.map((invite) => {
                  const expired =
                    invite.status === "PENDING" && isExpired(invite.expires_at);
                  const effectiveStatus = expired ? "EXPIRED" : invite.status;
                  const acceptUrl =
                    invite.token && invite.status === "PENDING" && !expired
                      ? `${appUrl}/accept-financier-invite?token=${invite.token}`
                      : null;

                  return (
                    <li key={invite.id} className="p-5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {invite.email ?? "e-mail não informado"}
                            </span>
                            {invite.org_name && (
                              <span className="text-xs text-slate-500">
                                — {invite.org_name}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Criado em {formatDate(invite.created_at)}
                            {invite.expires_at
                              ? ` · Expira em ${formatDate(invite.expires_at)}`
                              : ""}
                            {invite.accepted_at
                              ? ` · Aceito em ${formatDate(invite.accepted_at)}`
                              : ""}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${inviteStatusClass(effectiveStatus)}`}
                        >
                          {inviteStatusLabel(effectiveStatus)}
                        </span>
                      </div>

                      {/* Link de aceite visível para o financiador copiar */}
                      {acceptUrl && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                          <p className="text-xs font-medium text-blue-800 mb-1">
                            Link de aceite (compartilhe com a organização):
                          </p>
                          <code className="block break-all text-xs text-blue-700 select-all">
                            {acceptUrl}
                          </code>
                        </div>
                      )}

                      {/* Ações: só para convites pendentes não-expirados */}
                      {invite.status === "PENDING" && !expired && (
                        <div className="flex flex-wrap gap-2">
                          {/* Reenviar */}
                          <form action={resendInviteAction}>
                            <input type="hidden" name="invite_id" value={invite.id} />
                            <input type="hidden" name="email" value={invite.email ?? ""} />
                            <input type="hidden" name="org_name" value={invite.org_name ?? ""} />
                            <button
                              type="submit"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                            >
                              Renovar link
                            </button>
                          </form>

                          {/* Revogar */}
                          <form action={revokeInviteAction}>
                            <input type="hidden" name="invite_id" value={invite.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                            >
                              Revogar
                            </button>
                          </form>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {invites.length === 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Nenhum convite enviado ainda
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Use o formulário acima para convidar sua primeira organização.
              </p>
            </section>
          )}

          {/* Organizações já vinculadas (aceitas) */}
          {orgs.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">
                  Organizações na sua carteira
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {orgs.length} organização{orgs.length > 1 ? "ões" : ""} vinculada{orgs.length > 1 ? "s" : ""}.
                </p>
              </div>
              <ul className="divide-y divide-slate-200">
                {orgs.map((org) => (
                  <li key={org.id} className="flex items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-900">
                        {org.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        ID: {shortId(org.id)}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/organizations/${org.id}`}
                      className="shrink-0 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Abrir
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* ── CONSULTANT ───────────────────────────────────────────── */}
      {role === "CONSULTANT" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Acesso de consultor
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Como consultor, você acompanha organizações através dos projetos
            vinculados ao seu perfil. Acesse os projetos pelo menu lateral.
          </p>
          <Link
            href="/dashboard/projects"
            className="mt-4 inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ver meus projetos
          </Link>
        </section>
      )}

      {/* ── ORG ──────────────────────────────────────────────────── */}
      {role === "ORG" && (
        <>
          {orgs.length === 0 ? (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  Você ainda não está vinculado a uma organização
                </h2>
                <p className="text-sm text-slate-600">
                  Para operar na Transparência Social, sua organização precisa
                  ser vinculada a um financiador. Solicite um convite ao
                  financiador responsável.
                </p>
              </div>

              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="text-sm font-semibold text-blue-900">
                  Como funciona?
                </h3>
                <p className="mt-1 text-sm text-blue-800">
                  O financiador envia um link de aceite. Ao clicar no link,
                  você cria sua conta e sua organização fica automaticamente
                  vinculada — podendo criar projetos e relatórios.
                </p>
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Minhas organizações</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Escolha uma organização para visualizar dados, documentos e questionários.
                </p>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-200">
                  {orgs.map((org) => {
                    const orgRole = membershipMap.get(org.id);
                    return (
                      <li key={org.id} className="flex items-center justify-between gap-4 p-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-slate-900">
                              {org.name}
                            </h3>
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              {membershipRoleLabel(orgRole)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            ID: {shortId(org.id)}
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/organizations/${org.id}`}
                          className="shrink-0 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Abrir
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
