import { updatePasswordAction } from "@/app/actions/auth.actions";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error
    ? decodeURIComponent(searchParams.error)
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        action={updatePasswordAction}
        className="w-full max-w-md rounded-xl border bg-white p-6"
      >
        <h1 className="text-xl font-bold">Definir nova senha</h1>
        <p className="text-sm text-slate-600">
          Digite e confirme sua nova senha.
        </p>

        <label className="mt-6 block text-sm font-medium">Nova senha</label>
        <input
          className="mt-2 w-full rounded-lg border px-3 py-2"
          name="password"
          type="password"
          minLength={6}
          required
        />

        <label className="mt-4 block text-sm font-medium">
          Confirmar senha
        </label>
        <input
          className="mt-2 w-full rounded-lg border px-3 py-2"
          name="confirm"
          type="password"
          minLength={6}
          required
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-blue-600 py-2 font-semibold text-white"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
