/**
 * /signup — Tela de seleção de perfil.
 *
 * O usuário escolhe entre:
 *  - Financiador (signup aberto)
 *  - Organização (só entra por convite de financiador)
 */
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Transparência Social
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Criar conta
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Selecione o tipo de conta que melhor descreve seu papel.
          </p>
        </div>

        <div className="grid gap-4">
          {/* Card: Financiador */}
          <Link
            href="/signup/financiador"
            className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-lg font-bold">
                $
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-emerald-700 transition">
                  Sou financiador / empresa
                </h2>
                <p className="text-xs text-slate-500">
                  Empresas, fundações e órgãos que financiam projetos sociais.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-6">
              Crie sua conta, convide organizações e acompanhe os projetos
              que você apoia.
            </p>
            <span className="mt-1 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Cadastro aberto →
            </span>
          </Link>

          {/* Card: Organização */}
          <Link
            href="/signup/organizacao"
            className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-lg font-bold">
                O
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition">
                  Recebi um convite para minha organização
                </h2>
                <p className="text-xs text-slate-500">
                  ONGs, associações e institutos convidados por um financiador.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-6">
              Se você recebeu um link de convite de um financiador, use-o
              para criar sua conta vinculada.
            </p>
            <span className="mt-1 self-start rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Entrar por convite →
            </span>
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
