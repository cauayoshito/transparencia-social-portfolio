/**
 * /signup/organizacao — Ponto de entrada para org via convite.
 *
 * Com token    → redireciona para /accept-financier-invite?token=xxx
 * Sem token    → mostra mensagem de bloqueio com instruções
 */
import Link from "next/link";
import { redirect } from "next/navigation";

type Props = {
  searchParams?: { token?: string | string[] };
};

export default function SignupOrganizacaoPage({ searchParams }: Props) {
  const token =
    typeof searchParams?.token === "string"
      ? searchParams.token.trim()
      : "";

  // Se tem token, delega imediatamente para a tela de aceite
  if (token) {
    redirect(`/accept-financier-invite?token=${encodeURIComponent(token)}`);
  }

  // Sem token: bloqueio informativo
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/signup" className="text-xs text-slate-500 hover:underline">
            ← Voltar à seleção
          </Link>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Transparência Social
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Cadastro de organização
          </h1>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h2 className="text-base font-semibold text-amber-900">
                Organizações entram apenas por convite
              </h2>
              <p className="mt-2 text-sm text-amber-800 leading-6">
                O cadastro de organizações na Transparência Social funciona
                pelo convite de um financiador. Se você recebeu um link de
                convite por e-mail, use-o para criar sua conta.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Como funciona?
          </h3>
          <ol className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-slate-400">1.</span>
              O financiador (empresa ou fundo) cria um convite no painel dele.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-slate-400">2.</span>
              Você recebe um link de aceite — pode ser por e-mail, WhatsApp ou
              outro canal combinado com o financiador.
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-bold text-slate-400">3.</span>
              Ao clicar no link, sua conta e organização são criadas já
              vinculadas ao financiador.
            </li>
          </ol>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Não recebeu o link? Entre em contato diretamente com o
              financiador responsável.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
