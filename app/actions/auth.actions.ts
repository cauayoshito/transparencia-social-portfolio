"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Email%20e%20senha%20sao%20obrigatorios.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/signup?error=Email%20e%20senha%20sao%20obrigatorios.");
  }
  if (password.length < 6) {
    redirect(
      "/signup?error=Senha%20deve%20ter%20pelo%20menos%206%20caracteres."
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);

  // MVP: volta para login com aviso
  redirect("/login?success=Cadastro%20criado.%20Faca%20login.");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/forgot-password?error=Informe%20o%20email.");

  const supabase = createClient();
  const origin = headers().get("origin") ?? "";

  // IMPORTANTE: precisa do /auth/callback para trocar o code por sessão cookie
  const redirectTo = `${origin}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error)
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);

  // Não vaza se o e-mail existe
  redirect(
    "/forgot-password?success=Se%20o%20email%20existir,%20enviamos%20o%20link%20de%20redefinicao."
  );
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password || password.length < 6) {
    redirect(
      "/reset-password?error=Senha%20deve%20ter%20pelo%20menos%206%20caracteres."
    );
  }
  if (password !== confirm) {
    redirect("/reset-password?error=As%20senhas%20nao%20conferem.");
  }

  const supabase = createClient();

  // garante que a sessão veio do callback
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    redirect(
      "/login?error=Sessao%20invalida.%20Solicite%20a%20redefinicao%20novamente."
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error)
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);

  redirect("/login?success=Senha%20atualizada.%20Faca%20login.");
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─────────────────────────────────────────────────────────────────
// FINANCIADOR: signup aberto — cria auth user + investor + membership
// ─────────────────────────────────────────────────────────────────
export async function signUpFinanciadorAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const investorName = String(formData.get("investor_name") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim() || null;

  if (!email || !email.includes("@")) {
    redirect("/signup/financiador?error=Informe%20um%20e-mail%20v%C3%A1lido.");
  }
  if (!password || password.length < 6) {
    redirect(
      "/signup/financiador?error=Senha%20deve%20ter%20pelo%20menos%206%20caracteres."
    );
  }
  if (!fullName) {
    redirect("/signup/financiador?error=Informe%20seu%20nome%20completo.");
  }
  if (!investorName) {
    redirect(
      "/signup/financiador?error=Informe%20o%20nome%20da%20empresa%20ou%20institui%C3%A7%C3%A3o."
    );
  }

  // Criar auth user via admin (para confirmar e-mail automaticamente e
  // ter o ID disponível imediatamente para inserir no banco)
  const adminDb = createAdminClient() as any;

  const { data: authData, error: signUpErr } =
    await adminDb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (signUpErr || !authData?.user) {
    const msg = encodeURIComponent(
      signUpErr?.message ?? "Falha ao criar conta. Tente novamente."
    );
    redirect(`/signup/financiador?error=${msg}`);
  }

  const userId = authData.user.id;

  // Profile
  await adminDb
    .from("profiles")
    .upsert({ id: userId, full_name: fullName, email }, { onConflict: "id" });

  // Investor
  const { data: investorData, error: investorErr } = await adminDb
    .from("investors")
    .insert({ name: investorName, document })
    .select("id")
    .single();

  if (investorErr || !investorData) {
    await adminDb.auth.admin.deleteUser(userId);
    const msg = encodeURIComponent(
      "Falha ao criar perfil de financiador: " +
        (investorErr?.message ?? "erro desconhecido")
    );
    redirect(`/signup/financiador?error=${msg}`);
  }

  // Investor membership (MASTER)
  const { error: memErr } = await adminDb.from("investor_memberships").insert({
    investor_id: investorData.id,
    user_id: userId,
    role: "MASTER",
  });

  if (memErr) {
    await adminDb.auth.admin.deleteUser(userId);
    await adminDb.from("investors").delete().eq("id", investorData.id);
    const msg = encodeURIComponent(
      "Falha ao vincular perfil: " + memErr.message
    );
    redirect(`/signup/financiador?error=${msg}`);
  }

  redirect(
    "/login?success=Cadastro%20criado%20com%20sucesso!%20Fa%C3%A7a%20login%20para%20acessar%20o%20painel."
  );
}
