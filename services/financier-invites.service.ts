/**
 * Service: convites financiador → organização.
 * Tabela subjacente: organization_investor_links
 * (is_legacy=false = convites reais; is_legacy=true = backfill de dados antigos)
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FinancierInviteRow = {
  id: string;
  investor_id: string;
  organization_id: string | null;
  email: string | null;
  org_name: string | null;
  token: string | null;
  status: string;
  accepted_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  accepted_by_user_id: string | null;
  is_legacy: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type InviteWithInvestor = FinancierInviteRow & {
  investor: { id: string; name: string } | null;
};

function serviceErr(base: string, msg: string) {
  return new Error(`${base}: ${msg}`);
}

/**
 * Lista convites (não-legados) criados por um financiador.
 * Ordena por data de criação decrescente.
 */
export async function listInvitesForInvestor(
  investorId: string
): Promise<FinancierInviteRow[]> {
  if (!investorId) return [];
  const db = createClient() as any;

  const { data, error } = await db
    .from("organization_investor_links")
    .select("*")
    .eq("investor_id", investorId)
    .eq("is_legacy", false)
    .order("created_at", { ascending: false });

  if (error) throw serviceErr("Falha ao listar convites", error.message);
  return (data ?? []) as FinancierInviteRow[];
}

/**
 * Busca convite por token.
 * Usa admin client porque o usuário ainda não tem sessão ativa
 * no momento do aceite (está se cadastrando).
 */
export async function getInviteByToken(
  token: string
): Promise<InviteWithInvestor | null> {
  if (!token) return null;
  const db = createAdminClient() as any;

  const { data, error } = await db
    .from("organization_investor_links")
    .select("*, investor:investors(id, name)")
    .eq("token", token)
    .eq("status", "PENDING")
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  return data as InviteWithInvestor;
}

/**
 * Cria convite pendente (30 dias de validade).
 */
export async function createFinancierInvite(
  investorId: string,
  email: string,
  orgName: string | null,
  createdBy: string
): Promise<{ id: string; token: string }> {
  const db = createClient() as any;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data, error } = await db
    .from("organization_investor_links")
    .insert({
      investor_id: investorId,
      email: email.toLowerCase().trim(),
      org_name: orgName || null,
      status: "PENDING",
      is_legacy: false,
      expires_at: expiresAt.toISOString(),
      created_by: createdBy,
    })
    .select("id, token")
    .single();

  if (error || !data) {
    throw serviceErr(
      "Falha ao criar convite",
      error?.message ?? "erro desconhecido"
    );
  }

  return data as { id: string; token: string };
}

/**
 * Revoga convite pendente.
 * Só opera em registros com status=PENDING para evitar
 * revogar acidentalmente um link já ativo.
 */
export async function revokeFinancierInvite(inviteId: string): Promise<void> {
  const db = createClient() as any;

  const { error } = await db
    .from("organization_investor_links")
    .update({
      status: "REVOKED",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inviteId)
    .eq("status", "PENDING");

  if (error) throw serviceErr("Falha ao revogar convite", error.message);
}

/**
 * Ativa link após aceite do convite.
 * Usa admin client pois é chamado durante o processo de criação
 * de conta, antes da sessão da nova organização estar ativa.
 */
export async function activateInviteLink(
  token: string,
  orgId: string,
  userId: string
): Promise<void> {
  const db = createAdminClient() as any;

  const { error } = await db
    .from("organization_investor_links")
    .update({
      organization_id: orgId,
      status: "ACTIVE",
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("token", token)
    .eq("status", "PENDING");

  if (error) throw serviceErr("Falha ao ativar vínculo", error.message);
}
