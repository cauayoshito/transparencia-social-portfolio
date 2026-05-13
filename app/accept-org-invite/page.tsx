import Link from "next/link";
import { getOrgInviteByToken, acceptOrgInviteAction } from "@/app/actions/org-invite.actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: {
    token?: string | string[];
    error?: string | string[];
    success?: string | string[];
  };
};

function readStr(v?: string | string[]) {
  return typeof v === "string" ? v.trim() : "";
}

function readMsg(v?: string | string[]) {
  return typeof v === "string" ? decodeURIComponent(v) : null;
}

export default async function AcceptOrgInvitePage({ searchParams }: Props) {
  const token = readStr(searchParams?.token);
  const error = readMsg(searchParams?.error);
  const success = readMsg(searchParams?.success);

  const invite = token ? await getOrgInviteByToken(token) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          Aceitar convite de financiador
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Um financiador está convidando sua organização para a plataforma
          Transparência Social.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {!token && !error && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Nenhum token de convite informado. Use o link completo enviado pelo
            financiador.
          </div>
        )}

        {token && !invite && !error && (
          <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Convite não encontrado, já utilizado ou expirado. Solicite um novo
            convite ao financiador.
          </div>
        )}

        {invite && (
          <>
            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p>
                <span className="font-semibold">E-mail convidado:</span>{" "}
                {invite.email}
              </p>
              {invite.org_name && (
                <p className="mt-1">
                  <span className="font-semibold">Nome sugerido:</span>{" "}
                  {invite.org_name}
                </p>
              )}
            </div>

            <form action={acceptOrgInviteAction} className="mt-5 space-y-4">
              <input type="hidden" name="token" value={token} />

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nome da organização
                </label>
                <input
                  name="org_name"
                  required
                  defaultValue={invite.org_name ?? ""}
                  placeholder="Ex: Instituto Comunidade Viva"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Confirme ou ajuste o nome da sua organização.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Criar organização e aceitar vínculo
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Ir para login
          </Link>
          {" · "}
          <Link href="/dashboard" className="font-medium text-blue-600 hover:underline">
            Ir para o painel
          </Link>
        </div>
      </div>
    </main>
  );
}
