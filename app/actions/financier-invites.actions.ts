"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createFinancierInvite,
  revokeFinancierInvite,
  activateInviteLink,
} from "@/services/financier-invites.service";

function enc(v: string) {
  return encodeURIComponent(v);
}

// ─────────────────────────────────────────────────────────────────
// INVESTOR: criar convite para organização
// ─────────────────────────────────────────────────────────────────
export async function inviteOrganizationAction(formData: FormData) {
  const user = await requireUser();
  const ctx = await getUserContext(user.id);
  const role = getPrimaryRole(ctx);

  if (role !== "INVESTOR") {
    redirect(
      `/dashboard/organizations?error=${enc("Apenas financiadores podem convidar organizações.")}`
    );
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const orgName =
    String(formData.get("org_name") ?? "").trim() || null;

  if (!email || !email.includes("@")) {
    redirect(
      `/dashboard/organizations?error=${enc("Informe um e-mail válido para o convite.")}`
    );
  }

  const investorId = ctx.investorMembership?.investor_id;
  if (!investorId) {
    redirect(
      `/dashboard/organizations?error=${enc("Perfil de financiador não identificado.")}`
    );
  }

  // Verificar duplicata pendente
  const db = createClient() as any;
  const { data: existing } = await db
    .from("organization_investor_links")
    .select("id")
    .eq("investor_id", investorId)
    .eq("email", email)
    .eq("status", "PENDING")
    .maybeSingle();

  if (existing) {
    redirect(
      `/dashboard/organizations?error=${enc("Já existe um convite pendente para este e-mail.")}`
    );
  }

  const invite = await createFinancierInvite(investorId, email, orgName, user.id);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  const acceptUrl = `${appUrl}/accept-financier-invite?token=${invite.token}`;

  revalidatePath("/dashboard/organizations");
  redirect(
    `/dashboard/organizations?success=${enc(`Convite criado! Link de aceite: ${acceptUrl}`)}`
  );
}

// ─────────────────────────────────────────────────────────────────
// INVESTOR: revogar convite pendente
// ─────────────────────────────────────────────────────────────────
export async function revokeInviteAction(formData: FormData) {
  const user = await requireUser();
  const ctx = await getUserContext(user.id);

  if (getPrimaryRole(ctx) !== "INVESTOR") {
    redirect(
      `/dashboard/organizations?error=${enc("Apenas financiadores podem revogar convites.")}`
    );
  }

  const inviteId = String(formData.get("invite_id") ?? "").trim();
  if (!inviteId) {
    redirect(
      `/dashboard/organizations?error=${enc("ID do convite não informado.")}`
    );
  }

  await revokeFinancierInvite(inviteId);

  revalidatePath("/dashboard/organizations");
  redirect(
    `/dashboard/organizations?success=${enc("Convite revogado com sucesso.")}`
  );
}

// ─────────────────────────────────────────────────────────────────
// INVESTOR: reenviar convite (revoga o antigo + cria novo token)
// ─────────────────────────────────────────────────────────────────
export async function resendInviteAction(formData: FormData) {
  const user = await requireUser();
  const ctx = await getUserContext(user.id);

  if (getPrimaryRole(ctx) !== "INVESTOR") {
    redirect(
      `/dashboard/organizations?error=${enc("Apenas financiadores podem reenviar convites.")}`
    );
  }

  const inviteId = String(formData.get("invite_id") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const orgName =
    String(formData.get("org_name") ?? "").trim() || null;
  const investorId = ctx.investorMembership?.investor_id;

  if (!inviteId || !email || !investorId) {
    redirect(
      `/dashboard/organizations?error=${enc("Dados insuficientes para reenviar o convite.")}`
    );
  }

  await revokeFinancierInvite(inviteId);
  const newInvite = await createFinancierInvite(investorId, email, orgName, user.id);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  const acceptUrl = `${appUrl}/accept-financier-invite?token=${newInvite.token}`;

  revalidatePath("/dashboard/organizations");
  redirect(
    `/dashboard/organizations?success=${enc(`Novo link gerado: ${acceptUrl}`)}`
  );
}

// ─────────────────────────────────────────────────────────────────
// ORG: aceitar convite — cria conta completa (auth + org + link)
// Chamado pelo formulário em /accept-financier-invite
// Não exige requireUser() pois o usuário ainda não existe
// ─────────────────────────────────────────────────────────────────
export async function acceptFinancierInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const orgName = String(formData.get("org_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!token) {
    redirect(`/accept-financier-invite?error=${enc("Token de convite inválido.")}`);
  }
  if (!orgName) {
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc("Informe o nome da organização.")}`
    );
  }
  if (!fullName) {
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc("Informe seu nome completo.")}`
    );
  }
  if (!email || !email.includes("@")) {
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc("Informe um e-mail válido.")}`
    );
  }
  if (!password || password.length < 6) {
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc("A senha deve ter pelo menos 6 caracteres.")}`
    );
  }

  const adminDb = createAdminClient() as any;

  // 1. Validar token (sem sessão → admin client)
  const { data: invite, error: inviteErr } = await adminDb
    .from("organization_investor_links")
    .select("id, investor_id, email, org_name, status, expires_at")
    .eq("token", token)
    .eq("status", "PENDING")
    .maybeSingle();

  if (inviteErr || !invite) {
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc("Convite não encontrado ou já utilizado.")}`
    );
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc("Este convite expirou. Solicite um novo ao financiador.")}`
    );
  }

  // 2. Criar auth user (confirmação automática — sem e-mail de verificação)
  const { data: authData, error: signUpError } =
    await adminDb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (signUpError || !authData?.user) {
    const msg = signUpError?.message ?? "Erro ao criar conta.";
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc(msg)}`
    );
  }

  const newUserId = authData.user.id;

  // 3. Criar profile
  await adminDb
    .from("profiles")
    .upsert({ id: newUserId, full_name: fullName, email }, { onConflict: "id" });

  // 4. Criar organização
  const orgId = crypto.randomUUID();
  const { error: orgErr } = await adminDb.from("organizations").insert({
    id: orgId,
    name: orgName,
    email,
    responsible_user_id: newUserId,
  });

  if (orgErr) {
    await adminDb.auth.admin.deleteUser(newUserId);
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc("Falha ao criar organização: " + orgErr.message)}`
    );
  }

  // 5. Criar membership ORG_ADMIN
  const { error: memErr } = await adminDb
    .from("organization_memberships")
    .insert({
      organization_id: orgId,
      user_id: newUserId,
      role: "ORG_ADMIN",
    });

  if (memErr) {
    await adminDb.auth.admin.deleteUser(newUserId);
    await adminDb.from("organizations").delete().eq("id", orgId);
    redirect(
      `/accept-financier-invite?token=${enc(token)}&error=${enc("Falha ao criar vínculo de membro: " + memErr.message)}`
    );
  }

  // 6. Ativar link financiador → organização
  try {
    await activateInviteLink(token, orgId, newUserId);
  } catch (e) {
    // Não-crítico: organização já criada, log e continua
    console.error("Falha ao ativar link (não-crítico):", e);
  }

  redirect(
    `/login?success=${enc("Conta criada com sucesso! Faça login para acessar o painel.")}`
  );
}
