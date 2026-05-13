import type { UserContext } from "@/services/membership.service";
import { getProjectByIdForUser } from "@/services/projects.service";

function normalizeRole(role: string | null | undefined): string {
  return (role ?? "").trim().toUpperCase();
}

export function isInvestorMaster(ctx: UserContext): boolean {
  const role = normalizeRole(ctx.investorMembership?.role);
  return role === "INVESTOR_MASTER" || role === "MASTER";
}

export function isOrgAdmin(ctx: UserContext): boolean {
  return normalizeRole(ctx.orgMembership?.role) === "ORG_ADMIN";
}

export function isConsultant(ctx: UserContext): boolean {
  return ctx.roles.includes("CONSULTANT");
}

export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  const project = await getProjectByIdForUser(projectId, userId);
  return Boolean(project);
}

