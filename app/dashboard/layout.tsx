import type { ReactNode } from "react";
import { requireUser } from "@/services/auth.service";
import { getUserContext } from "@/services/membership.service";
import { getPrimaryRole, getRoleLabel } from "@/lib/roles";
import { getSidebarMenuItems } from "@/lib/sidebar-menu";
import DashboardShell from "@/components/dashboard/DashboardShell";

type Props = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: Props) {
  const user = await requireUser();

  let role: ReturnType<typeof getPrimaryRole> = "ORG";
  let roleLabel = "Organização Social";
  let menuItems = getSidebarMenuItems("ORG");

  try {
    const ctx = await getUserContext(user.id);
    role = getPrimaryRole(ctx);
    roleLabel = getRoleLabel(role);
    menuItems = getSidebarMenuItems(role);
  } catch (error) {
    // Se falhar ao buscar contexto (ex: tabelas não existem ainda),
    // mantém fallback ORG para não quebrar a aplicação.
    console.error("[DashboardLayout] Falha ao resolver perfil:", error);
  }

  return (
    <DashboardShell
      role={role}
      roleLabel={roleLabel}
      menuItems={menuItems}
    >
      {children}
    </DashboardShell>
  );
}
