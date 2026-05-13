import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth.actions";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { error?: string; success?: string };
}) {
  const error = searchParams?.error
    ? decodeURIComponent(searchParams.error)
    : null;
  const success = searchParams?.success
    ? decodeURIComponent(searchParams.success)
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        action={requestPasswordResetAction}
        className="w-full max-w-md rounded-xl border bg-white p-6"
      >
        <h1 className="text-xl font-bold">Esqueci a senha</h1>
        <p className="text-sm text-slate-600">
          Vamos te enviar um link para redefinir.
        </p>

        <label className="mt-6 block text-sm font-medium">Email</label>
        <input
          className="mt-2 w-full rounded-lg border px-3 py-2"
          name="email"
          type="email"
          required
        />

        {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-blue-600 py-2 font-semibold text-white"
        >
          Enviar link
        </button>

        <div className="mt-4 text-sm">
          <Link className="text-slate-600 hover:underline" href="/login">
            Voltar para login
          </Link>
        </div>
      </form>
    </div>
  );
}
