"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialToken?: string;
};

type AcceptResponse = {
  organizationId?: string;
  role?: string;
  error?: string;
  details?: unknown;
};

function normalizeErrorMessage(payload: AcceptResponse, fallback: string) {
  const parts: string[] = [];

  if (payload.error) parts.push(String(payload.error));

  if (typeof payload.details === "string" && payload.details.trim()) {
    parts.push(payload.details.trim());
  }

  if (
    payload.details &&
    typeof payload.details === "object" &&
    !Array.isArray(payload.details)
  ) {
    const maybeMessage =
      "message" in payload.details
        ? String((payload.details as { message?: unknown }).message ?? "")
        : "";

    if (maybeMessage.trim()) parts.push(maybeMessage.trim());
  }

  const text = parts.filter(Boolean).join(" | ").trim();
  return text || fallback;
}

export default function AcceptInviteForm({ initialToken = "" }: Props) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => token.trim().length > 0, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const text = await response.text();

      let json: AcceptResponse = {};
      try {
        json = text ? (JSON.parse(text) as AcceptResponse) : {};
      } catch {
        json = {
          error: "Falha ao aceitar convite.",
          details: text,
        };
      }

      if (!response.ok) {
        setError(normalizeErrorMessage(json, "Falha ao aceitar convite."));
        return;
      }

      setSuccess("Convite aceito com sucesso. Redirecionando...");

      const organizationId = json.organizationId;
      const url = organizationId
        ? `/dashboard?org=${encodeURIComponent(organizationId)}`
        : "/dashboard";

      setTimeout(() => {
        router.replace(url);
        router.refresh();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold text-slate-900">Aceitar convite</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cole o token do convite para entrar na organização.
      </p>

      <label
        htmlFor="token"
        className="mt-4 block text-sm font-medium text-slate-900"
      >
        Token
      </label>

      <input
        id="token"
        name="token"
        type="text"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-300"
        placeholder="UUID do convite"
        required
      />

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="mt-6 w-full rounded-lg bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Aceitando..." : "Aceitar convite"}
      </button>
    </form>
  );
}
