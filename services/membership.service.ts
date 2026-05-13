import { createClient } from "@/lib/supabase/server";
import {
  formatWrongSupabaseProjectError,
  isSupabaseTableNotFoundError,
} from "@/lib/supabase/diagnostics";
import type { Database } from "@/types/database";

type InvestorMembershipRow =
  Database["public"]["Tables"]["investor_memberships"]["Row"];
type OrganizationMembershipRow =
  Database["public"]["Tables"]["organization_memberships"]["Row"];
type InvestorRow = Database["public"]["Tables"]["investors"]["Row"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

type InvestorMembership = InvestorMembershipRow & {
  investor: InvestorRow | null;
};

type OrganizationMembership = OrganizationMembershipRow & {
  organization: OrganizationRow | null;
};

export type UserContext = {
  investorMembership?: InvestorMembership;
  orgMembership?: OrganizationMembership;
  roles: string[];
};

/**
 * Roles que você usa no app:
 * - "ORG" quando tem qualquer organization_membership
 * - "INVESTOR" quando tem qualquer investor_membership
 * - "CONSULTANT" quando tem project_consultant ativo
 * - Além disso, inclui o role do membership em si (ex: ORG_ADMIN / ORG_MEMBER)
 */
function normalizeRole(role: string | null | undefined): string {
  return (role ?? "").trim().toUpperCase();
}

function membershipServiceError(
  baseMessage: string,
  rawMessage: string
): string {
  if (isSupabaseTableNotFoundError(rawMessage)) {
    return formatWrongSupabaseProjectError(
      baseMessage,
      "Tabela nao encontrada no schema cache."
    );
  }
  return `${baseMessage}: ${rawMessage}`;
}

export async function getInvestorMemberships(
  userId: string
): Promise<InvestorMembership[]> {
  const supabase = createClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("investor_memberships")
    .select("*, investor:investors(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      membershipServiceError(
        "Falha ao buscar vinculos de investidor",
        error.message
      )
    );
  }

  return (data ?? []) as InvestorMembership[];
}

export async function getOrganizationMemberships(
  userId: string
): Promise<OrganizationMembership[]> {
  const supabase = createClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("organization_memberships")
    .select("*, organization:organizations(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      membershipServiceError(
        "Falha ao buscar vinculos de organizacao",
        error.message
      )
    );
  }

  return (data ?? []) as OrganizationMembership[];
}

export async function getCurrentInvestor(
  userId: string
): Promise<InvestorMembership | undefined> {
  const memberships = await getInvestorMemberships(userId);
  return memberships[0];
}

export async function getCurrentOrganization(
  userId: string
): Promise<OrganizationMembership | undefined> {
  const memberships = await getOrganizationMemberships(userId);
  return memberships[0];
}

export async function getUserContext(userId: string): Promise<UserContext> {
  const supabase = createClient();
  const db = supabase as any;

  const [investorMemberships, organizationMemberships, consultantLinksRes] =
    await Promise.all([
      getInvestorMemberships(userId),
      getOrganizationMemberships(userId),
      db
        .from("project_consultants")
        .select("project_id, consultant_user_id, active")
        .eq("consultant_user_id", userId)
        .eq("active", true)
        .limit(1),
    ]);

  if (consultantLinksRes.error) {
    throw new Error(
      membershipServiceError(
        "Falha ao buscar vinculo de consultoria",
        consultantLinksRes.error.message
      )
    );
  }

  const roles = new Set<string>();

  // Investor roles
  if (investorMemberships.length > 0) {
    roles.add("INVESTOR");
    investorMemberships.forEach((m) => {
      const r = normalizeRole(m.role);
      if (r) roles.add(r);
    });
  }

  // Org roles
  if (organizationMemberships.length > 0) {
    roles.add("ORG");
    organizationMemberships.forEach((m) => {
      const r = normalizeRole(m.role);
      if (r) roles.add(r);
    });
  }

  // Consultant role
  if ((consultantLinksRes.data ?? []).length > 0) {
    roles.add("CONSULTANT");
  }

  return {
    investorMembership: investorMemberships[0],
    orgMembership: organizationMemberships[0],
    roles: Array.from(roles),
  };
}

/**
 * Helpers opcionais
 */
export function hasRole(ctx: UserContext, role: string): boolean {
  const target = normalizeRole(role);
  return ctx.roles.some((r) => normalizeRole(r) === target);
}
