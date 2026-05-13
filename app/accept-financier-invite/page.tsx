/**
 * Rota pública: /accept-financier-invite?token=xxx
 *
 * Fluxo:
 *  1. Valida o token (convite pendente e não-expirado)
 *  2. Mostra nome do financiador + nome sugerido da org
 *  3. Formulário: nome completo, e-mail, senha, nome da org
 *  4. Ao submeter: cria auth user + profile + org + membership + ativa link
 */
import Link from "next/link";
import { getInviteByToken } from "@/services/financier-invites.service";
import { acceptFinancierInviteAction } from "@/app/actions/financier-invites.actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: {
    token?: string | string[];
    error?: string | string[];
  };
};

function readStr(v?: string | string[]) {
  return typeof v === "string" ? v.trim() : "";
}

function readMsg(v?: string | string[]) {
  return typeof v === "string" ? decodeURIComponent(v) : null;
}

export default async function AcceptFinancierInvitePage({ searchParams }: Props) {
  const token = readStr(searchParams?.token);
  const error = readMsg(searchParams?.error);

  const invite = token ? await getInviteByToken(token) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        {/* Logo / Brand */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Transparência Social
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            Aceitar convite de financiador
          </h1>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Sem token */}
        {!token && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Nenhum token de convite informado. Use o link completo enviado
            pelo financiador.
          </div>
        )}

        {/* Token inválido ou expirado */}
        {token && !invite && !error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Convite não encontrado, já utilizado ou expirado. Solicite um
            novo link ao financiador.
          </div>
        )}

        {/* Token válido: exibe formulário */}
        {invite && (
          <>
            {/* Card: quem convidou */}
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p>
                <span className="font-semibold">Financiador:</span>{" "}
                {invite.investor?.name ?? "—"}
              </p>
              {invite.org_name && (
                <p className="mt-1">
                  <span className="font-semibold">Nome sugerido para a organização:</span>{" "}
                  {invite.org_name}
                </p>
              )}
              {invite.email && (
                <p className="mt-1">
                  <span className="font-semibold">E-mail do convite:</span>{" "}
                  {invite.email}
                </p>
              )}
            </div>

            <p className="mb-5 text-sm text-slate-600">
              Preencha os dados abaixo para criar sua conta e vincular sua
              organização ao financiador.
            </p>

            <form action={acceptFinancierInviteAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />

              {/* Nome completo */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Seu nome completo *
                </label>
                <input
                  name="full_name"
                  required
                  placeholder="Ex: Maria da Silva"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Seu e-mail *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={invite.email ?? ""}
                  placeholder="seu@email.com"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Será usado para fazer login na plataforma.
                </p>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Senha *
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Nome da organização */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nome da organização *
                </label>
                <input
                  name="org_name"
                  required
                  defaultValue={invite.org_name ?? ""}
                  placeholder="Ex: Instituto Comunidade Viva"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Confirme ou ajuste o nome da sua organização.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Criar conta e aceitar vínculo
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Fazer login
          </Link>
        </div>
      </div>
    </main>
  );
}
