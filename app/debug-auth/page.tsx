import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/services/membership.service";

export const dynamic = "force-dynamic";

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function pickOrgIdCandidates(ctx: any) {
  const candidates: Array<[string, any]> = [
    ["ctx.organization_id", ctx?.organization_id],
    ["ctx.organizationId", ctx?.organizationId],
    ["ctx.org_id", ctx?.org_id],
    ["ctx.orgId", ctx?.orgId],
    ["ctx.membership.organization_id", ctx?.membership?.organization_id],
    ["ctx.membership.organizationId", ctx?.membership?.organizationId],
    [
      "ctx.memberships[0].organization_id",
      ctx?.memberships?.[0]?.organization_id,
    ],
    [
      "ctx.memberships[0].organizationId",
      ctx?.memberships?.[0]?.organizationId,
    ],
  ];

  return candidates.filter(([, v]) => typeof v === "string" && v.length > 0);
}

export default async function DebugAuthPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // memberships direto do banco (fonte de verdade pro org_id)
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, user_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // seu contexto (o que você usa no app)
  const ctx = await getUserContext(user.id);

  const candidates = pickOrgIdCandidates(ctx);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Debug Auth (Transparência Social)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tela de diagnóstico para bater{" "}
            <span className="font-medium">auth.uid()</span>, memberships e
            contexto.
          </p>
        </div>

        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
          Voltar
        </a>
      </header>

      {/* USER */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Usuário autenticado
          </h2>
        </div>

        <div className="p-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              user.id (auth.uid)
            </p>
            <p className="mt-2 font-mono text-sm text-slate-900 break-all">
              {user.id}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              email
            </p>
            <p className="mt-2 font-mono text-sm text-slate-900 break-all">
              {user.email ?? "—"}
            </p>
          </div>
        </div>
      </section>

      {/* MEMBERSHIPS */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Memberships (DB)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Fonte mais confiável para saber qual{" "}
            <span className="font-medium">organization_id</span> você deve usar.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {membershipsError && (
            <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              Erro ao buscar memberships: {membershipsError.message}
            </div>
          )}

          {!memberships || memberships.length === 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Nenhuma membership encontrada para este usuário.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">organization_id</th>
                    <th className="px-4 py-3">role</th>
                    <th className="px-4 py-3">created_at</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m: any) => (
                    <tr
                      key={`${m.organization_id}-${m.created_at}`}
                      className="border-t"
                    >
                      <td className="px-4 py-3 font-mono text-xs break-all">
                        {m.organization_id}
                      </td>
                      <td className="px-4 py-3">{m.role}</td>
                      <td className="px-4 py-3 font-mono text-xs break-all">
                        {m.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CONTEXT */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            getUserContext(user.id)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Aqui a gente descobre a chave certa:{" "}
            <span className="font-medium">
              organizationId / organization_id / org_id
            </span>
            .
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Candidatos detectados (org id)
            </p>

            {candidates.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                Nenhuma chave candidata encontrada automaticamente.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {candidates.map(([k, v]) => (
                  <li key={k} className="text-sm">
                    <span className="font-mono text-xs text-slate-500">
                      {k}:
                    </span>{" "}
                    <span className="font-mono text-xs text-slate-900 break-all">
                      {String(v)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              ctx (raw)
            </p>
            <pre className="mt-3 max-h-[380px] overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
              {safeStringify(ctx)}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
