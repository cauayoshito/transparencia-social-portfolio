"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
            <Image
              src="/branding/TransparenciaSocial.png"
              alt="Logo Transparência Social"
              fill
              sizes="48px"
              className="object-contain"
              priority
            />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Transparência Social
            </h1>
            <p className="text-sm text-slate-600">
              Entre para acessar sua conta
            </p>
          </div>
        </div>

        <label
          htmlFor="email"
          className="mt-6 block text-sm font-medium text-slate-700"
        >
          Email
        </label>
        <input
          id="email"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
        />

        <label
          htmlFor="password"
          className="mt-4 block text-sm font-medium text-slate-700"
        >
          Senha
        </label>
        <input
          id="password"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <Link
            href="/forgot-password"
            className="text-slate-600 transition hover:text-slate-900 hover:underline"
          >
            Esqueci minha senha
          </Link>

          <Link
            href="/signup"
            className="font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
          >
            Criar conta
          </Link>
        </div>
      </form>
    </div>
  );
}
