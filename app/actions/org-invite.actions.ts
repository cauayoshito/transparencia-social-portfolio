"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole } from "@/lib/roles";

function enc(v: string) {
  return encodeURIComponent(v);
}

/**
 * INVESTOR cria convite para organização.
 * Gera um token único e salva como PENDING.
 */
export async function createOrgInviteAction(formData: FormData) {
  const user = await requireUser();

  const ctx = await getUserContext(user.id);
  const role = getPrimaryRole(ctx);

  if (role !== "INVESTOR") {
    redirect(
      `/dashboard/organizations?error=${enc(
        "Apenas financiadores podem convidar organizações."
      )}`
    );
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const orgName = String(formData.get("org_name") ?? "").trim();

  if (!email || !email.includes("@")) {
    redirect(
      `/dashboard/organizations?error=${enc(
        "Informe um e-mail válido para enviar o convite."
      )}`
    );
  }

  const investorId = ctx.investorMembership?.investor_id;

  if (!investorId) {
    redirect(
      `/dashboard/organizations?error=${enc(
        "Não foi possível identificar seu perfil de financiador."
      )}`
    );
  }

  const supabase = createClient();

  const { data: existing } = await (supabase as any)
    .from("organization_investor_links")
    .select("id")
    .eq("investor_id", investorId)
    .eq("email", email)
    .eq("status", "PENDING")
    .maybeSingle();

  if (existing) {
    redirect(
      `/dashboard/organizations?error=${enc(
        "Já existe um convite pendente para este e-mail."
      )}`
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data: invite, error } = await (supabase as any)
    .from("organization_investor_links")
    .insert({
      investor_id: investorId,
      email,
      org_name: orgName || null,
      status: "PENDING",
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select("id, token")
    .single();

  if (error || !invite) {
    redirect(
      `/dashboard/organizations?error=${enc(
        "Falha ao criar convite: " + (error?.message ?? "erro desconhecido")
      )}`
    );
  }

  revalidatePath("/dashboard/organizations");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "")
    .trim()
    .replace(/\/$/, "");

  const acceptUrl = `${appUrl}/accept-org-invite?token=${invite.token}`;

  redirect(
    `/dashboard/organizations?success=${enc(
      `Convite enviado! Compartilhe este link com a organização: ${acceptUrl}`
    )}`
  );
}

/**
 * Buscar convite por token (usado na página de aceite).
 */
export async function getOrgInviteByToken(token: string) {
  if (!token) return null;

  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("organization_investor_links")
    .select("id, email, org_name, investor_id, status, expires_at")
    .eq("token", token)
    .eq("status", "PENDING")
    .maybeSingle();

  if (error || !data) return null;

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  return data;
}

/**
 * ORG aceita convite — cria organização + membership + ativa vínculo.
 */
export async function acceptOrgInviteAction(formData: FormData) {
  const user = await requireUser();

  const token = String(formData.get("token") ?? "").trim();
  const orgName = String(formData.get("org_name") ?? "").trim();

  if (!token) {
    redirect(`/accept-org-invite?error=${enc("Token de convite inválido.")}`);
  }

  if (!orgName) {
    redirect(
      `/accept-org-invite?token=${enc(token)}&error=${enc(
        "Informe o nome da organização."
      )}`
    );
  }

  const supabase = createClient();

  const { data: invite, error: inviteErr } = await (supabase as any)
    .from("organization_investor_links")
    .select("id, investor_id, email, status, expires_at")
    .eq("token", token)
    .eq("status", "PENDING")
    .maybeSingle();

  if (inviteErr || !invite) {
    redirect(
      `/accept-org-invite?token=${enc(token)}&error=${enc(
        "Convite não encontrado ou já utilizado."
      )}`
    );
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    redirect(
      `/accept-org-invite?token=${enc(token)}&error=${enc(
        "Este convite expirou. Solicite um novo ao financiador."
      )}`
    );
  }

  const orgId = crypto.randomUUID();

  const { error: orgErr } = await (supabase as any)
    .from("organizations")
    .insert({
      id: orgId,
      name: orgName,
    });

  if (orgErr) {
    redirect(
      `/accept-org-invite?token=${enc(token)}&error=${enc(
        "Falha ao criar organização: " + orgErr.message
      )}`
    );
  }

  const { error: memErr } = await (supabase as any)
    .from("organization_memberships")
    .insert({
      organization_id: orgId,
      user_id: user.id,
      role: "ORG_ADMIN",
    });

  if (memErr) {
    await (supabase as any).from("organizations").delete().eq("id", orgId);

    redirect(
      `/accept-org-invite?token=${enc(token)}&error=${enc(
        "Falha ao vincular seu perfil: " + memErr.message
      )}`
    );
  }

  const { error: linkErr } = await (supabase as any)
    .from("organization_investor_links")
    .update({
      organization_id: orgId,
      status: "ACTIVE",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  if (linkErr) {
    console.error("Falha ao ativar vínculo (não-crítico):", linkErr.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/organizations");

  redirect(
    `/dashboard?success=${enc(
      "Organização criada e vinculada ao financiador com sucesso!"
    )}`
  );
}
