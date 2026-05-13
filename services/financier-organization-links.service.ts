/**
 * Service: vínculos ativos financiador ↔ organização.
 * Lê organization_investor_links onde status = 'ACTIVE'.
 * Usado principalmente na criação de projetos.
 */
import { createClient } from "@/lib/supabase/server";

export type ActiveFinancierLink = {
  id: string;
  investor_id: string;
  investor_name: string;
  organization_id: string;
  is_legacy: boolean;
  accepted_at: string | null;
};

function serviceErr(base: string, msg: string) {
  return new Error(`${base}: ${msg}`);
}

/**
 * Retorna vínculos ativos de uma organização com seus financiadores.
 * Inclui links legados (is_legacy=true) pois eles são válidos para
 * permitir criação de projetos em dados históricos.
 */
export async function getActiveLinksForOrganization(
  organizationId: string
): Promise<ActiveFinancierLink[]> {
  if (!organizationId) return [];
  const db = createClient() as any;

  const { data, error } = await db
    .from("organization_investor_links")
    .select("id, investor_id, organization_id, is_legacy, accepted_at, investor:investors(name)")
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .order("accepted_at", { ascending: false });

  if (error) throw serviceErr("Falha ao buscar vínculos ativos", error.message);

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    investor_id: row.investor_id,
    investor_name: row.investor?.name ?? "Financiador desconhecido",
    organization_id: row.organization_id,
    is_legacy: row.is_legacy ?? false,
    accepted_at: row.accepted_at,
  }));
}

/**
 * Retorna vínculos ativos para múltiplas organizações.
 * Usado em "Novo projeto" quando o usuário é admin de várias orgs.
 */
export async function getActiveLinksForOrganizations(
  organizationIds: string[]
): Promise<ActiveFinancierLink[]> {
  if (!organizationIds.length) return [];
  const db = createClient() as any;

  const { data, error } = await db
    .from("organization_investor_links")
    .select("id, investor_id, organization_id, is_legacy, accepted_at, investor:investors(name)")
    .in("organization_id", organizationIds)
    .eq("status", "ACTIVE")
    .order("accepted_at", { ascending: false });

  if (error) throw serviceErr("Falha ao buscar vínculos ativos", error.message);

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    investor_id: row.investor_id,
    investor_name: row.investor?.name ?? "Financiador desconhecido",
    organization_id: row.organization_id,
    is_legacy: row.is_legacy ?? false,
    accepted_at: row.accepted_at,
  }));
}

/**
 * Verifica se uma organização tem pelo menos 1 vínculo ativo.
 * Usado como guarda de entrada na criação de projetos.
 */
export async function organizationHasActiveLink(
  organizationId: string
): Promise<boolean> {
  if (!organizationId) return false;
  const db = createClient() as any;

  const { count, error } = await db
    .from("organization_investor_links")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE");

  if (error) return false;
  return (count ?? 0) > 0;
}
