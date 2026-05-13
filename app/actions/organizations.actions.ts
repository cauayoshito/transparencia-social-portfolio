"use server";

import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

function enc(v: string) {
  return encodeURIComponent(v);
}

function createAuthedDbClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

type PostgrestErr = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

function logDbError(tag: string, err: PostgrestErr) {
  console.log(tag, {
    code: err.code ?? null,
    message: err.message,
    details: err.details ?? null,
    hint: err.hint ?? null,
  });
}

export async function createOrganizationAction(formData: FormData) {
  /**
   * P0.4: Criação livre de organização está BLOQUEADA.
   *
   * Regra de negócio: organização só deve existir vinculada a um financiador.
   * O fluxo correto é: financiador convida → organização aceita → org é criada.
   *
   * DÍVIDA TÉCNICA (P1):
   * - Criar tabela organization_investor_links
   * - Implementar fluxo de convite completo (financiador → org)
   * - Implementar fluxo de solicitação (org → financiador)
   * - Ao aceitar convite, criar org + link + membership numa transação
   *
   * Por ora, redireciona com mensagem explicativa.
   */
  redirect(
    `/dashboard/organizations?error=${enc(
      "A criação direta de organização foi desativada. Para operar na plataforma, sua organização precisa ser vinculada por um financiador. Solicite um convite ao financiador responsável."
    )}`
  );
}

export async function updateOrganizationAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId)
    redirect(`/dashboard/organizations?error=${enc("OrgId inválido.")}`);

  const supabase = createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect(`/login?error=${enc("Sessão expirada.")}`);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect(
      `/dashboard/organizations/${orgId}?error=${enc(
        "Sessão sem access_token. Refaça login."
      )}`
    );
  }

  const db = createAuthedDbClient(session.access_token);

  const payload = {
    name: String(formData.get("name") ?? "").trim() || null,
    responsible_user_id:
      String(formData.get("responsible_user_id") ?? "").trim() || null,
    tax_id_type: String(formData.get("tax_id_type") ?? "").trim() || null,
    document: String(formData.get("tax_id") ?? "").trim() || null,
    legal_name: String(formData.get("legal_name") ?? "").trim() || null,
    foundation_date:
      String(formData.get("foundation_date") ?? "").trim() || null,
    profile_type: String(formData.get("profile_type") ?? "").trim() || null,
    profile_other: String(formData.get("profile_other") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    facebook: String(formData.get("facebook") ?? "").trim() || null,
    instagram: String(formData.get("instagram") ?? "").trim() || null,
    site: String(formData.get("site") ?? "").trim() || null,
    linkedin: String(formData.get("linkedin") ?? "").trim() || null,
    bank_name: String(formData.get("bank_name") ?? "").trim() || null,
    bank_agency: String(formData.get("bank_agency") ?? "").trim() || null,
    bank_account: String(formData.get("bank_account") ?? "").trim() || null,
    pix_key: String(formData.get("pix_key") ?? "").trim() || null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from("organizations")
    .update(payload)
    .eq("id", orgId);

  if (error) {
    redirect(`/dashboard/organizations/${orgId}?error=${enc(error.message)}`);
  }

  redirect(
    `/dashboard/organizations/${orgId}?success=${enc("Organização salva.")}`
  );
}
