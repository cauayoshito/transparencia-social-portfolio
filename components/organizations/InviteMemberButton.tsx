"use client";

import { useMemo, useState } from "react";

type Props = {
  organizationId: string;
  organizationName?: string | null;
};

type InviteResponse = {
  inviteId?: string;
  token?: string;
  expiresAt?: string;
  acceptUrl?: string;
  error?: string;
  details?: string;
};

function formatRoleLabel(value: "ORG_ADMIN" | "ORG_MEMBER") {
  return value === "ORG_ADMIN" ? "Administrador" : "Membro";
}

function formatDateTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function InviteMemberButton({
  organizationId,
  organizationName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ORG_ADMIN" | "ORG_MEMBER">("ORG_MEMBER");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && expiresInDays >= 1 && expiresInDays <= 90;
  }, [email, expiresInDays]);

  function resetState() {
    setEmail("");
    setRole("ORG_MEMBER");
    setExpiresInDays(7);
    setSubmitting(false);
    setError(null);
    setResult(null);
    setCopied(false);
  }

  function closeModal() {
    setOpen(false);
    setTimeout(() => resetState(), 150);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch("/api/invites/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          email: email.trim().toLowerCase(),
          role,
          expiresInDays,
        }),
      });

      const data = (await response.json()) as InviteResponse;

      if (!response.ok) {
        setError(data.error || "Não foi possível criar o convite.");
        return;
      }

      setResult(data);
    } catch {
      setError("Erro de conexão ao criar convite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!result?.acceptUrl) return;

    try {
      await navigator.clipboard.writeText(result.acceptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Convidar membro
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Convidar membro
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Envie um convite para vincular um usuário à organização
                  {organizationName ? ` ${organizationName}` : ""}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              {!result ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm md:col-span-2">
                      E-mail do usuário
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@exemplo.com"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
                      />
                    </label>

                    <label className="text-sm">
                      Papel na organização
                      <select
                        value={role}
                        onChange={(e) =>
                          setRole(e.target.value as "ORG_ADMIN" | "ORG_MEMBER")
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-300"
                      >
                        <option value="ORG_MEMBER">Membro</option>
                        <option value="ORG_ADMIN">Administrador</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      Validade do convite
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={expiresInDays}
                        onChange={(e) =>
                          setExpiresInDays(Number(e.target.value || 7))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-300"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-700">
                      O convite será enviado para o e-mail informado com o papel{" "}
                      <span className="font-medium">
                        {formatRoleLabel(role)}
                      </span>
                      .
                    </p>
                  </div>

                  {error ? (
                    <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                      {error}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={!canSubmit || submitting}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Enviando..." : "Gerar convite"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                    <h3 className="text-sm font-semibold text-emerald-900">
                      Convite criado com sucesso
                    </h3>
                    <p className="mt-1 text-sm text-emerald-800">
                      O link abaixo pode ser enviado para o usuário aceitar o
                      acesso à organização.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Papel
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {formatRoleLabel(role)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Expira em
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {formatDateTime(result.expiresAt)}
                      </div>
                    </div>
                  </div>

                  <label className="block text-sm">
                    Link de aceite
                    <textarea
                      readOnly
                      value={result.acceptUrl ?? ""}
                      className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none"
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      Copie o link e envie para o usuário convidado.
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={copyLink}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        {copied ? "Link copiado" : "Copiar link"}
                      </button>

                      <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
