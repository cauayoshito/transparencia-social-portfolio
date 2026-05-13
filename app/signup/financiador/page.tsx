/**
 * /signup/financiador — Cadastro de financiador (aberto).
 *
 * Cria: auth user + profile + investor + investor_membership (MASTER).
 */
import Link from "next/link";
import { signUpFinanciadorAction } from "@/app/actions/auth.actions";

type Props = {
  searchParams?: { error?: string };
};

export default function SignupFinanciadorPage({ searchParams }: Props) {
  const error = searchParams?.error
    ? decodeURIComponent(searchParams.error)
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/signup"
            className="text-xs text-slate-500 hover:underline"
          >
            ← Voltar à seleção
          </Link>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Transparência Social
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Cadastro de financiador
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Empresas, fundações e instituições que financiam projetos sociais.
          </p>
        </div>

        <form
          action={signUpFinanciadorAction}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Seu nome completo *
            </label>
            <input
              name="full_name"
              required
              placeholder="Ex: João Rodrigues"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nome da empresa ou instituição *
            </label>
            <input
              name="investor_name"
              required
              placeholder="Ex: Fundação Exemplo S.A."
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              CNPJ (opcional)
            </label>
            <input
              name="document"
              placeholder="00.000.000/0001-00"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              E-mail *
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="voce@empresa.com.br"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

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
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Criar conta de financiador
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
