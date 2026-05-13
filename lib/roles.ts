import type { UserContext } from "@/services/membership.service";

/**
 * Os 3 perfis do sistema PHI.
 * Prioridade de resolução: INVESTOR > CONSULTANT > ORG
 */
export type PrimaryRole = "INVESTOR" | "CONSULTANT" | "ORG";

/**
 * Resolve o perfil principal do usuário a partir do UserContext.
 * Se o usuário tem investor_membership → INVESTOR.
 * Se tem consultant_link ativo → CONSULTANT.
 * Se tem organization_membership → ORG.
 * Fallback: ORG (para não quebrar se houver edge case).
 */
export function getPrimaryRole(ctx: UserContext): PrimaryRole {
  if (ctx.roles.includes("INVESTOR")) return "INVESTOR";
  if (ctx.roles.includes("CONSULTANT")) return "CONSULTANT";
  return "ORG";
}

/**
 * Label amigável do perfil para exibição na UI.
 */
export function getRoleLabel(role: PrimaryRole): string {
  switch (role) {
    case "INVESTOR":
      return "Empresa / Financiador";
    case "CONSULTANT":
      return "Consultor";
    case "ORG":
      return "Organização Social";
  }
}
