import type { ReactNode } from "react";
import type { PrimaryRole } from "@/lib/roles";

export type SidebarItem = {
  href: string;
  icon: ReactNode;
  label: string;
};

export function getSidebarMenuItems(role: PrimaryRole): SidebarItem[] {
  switch (role) {
    case "INVESTOR":
      return [
        { href: "/dashboard", icon: "📊", label: "Painel" },
        { href: "/dashboard/organizations", icon: "👥", label: "Organizações" },
        { href: "/dashboard/projects", icon: "🗂️", label: "Projetos" },
        { href: "/dashboard/reports", icon: "📄", label: "Relatórios" },
      ];

    case "CONSULTANT":
      return [
        { href: "/dashboard", icon: "📊", label: "Painel" },
        { href: "/dashboard/projects", icon: "🗂️", label: "Projetos" },
        { href: "/dashboard/reports", icon: "📄", label: "Relatórios" },
      ];

    case "ORG":
      return [
        { href: "/dashboard", icon: "📊", label: "Painel" },
        { href: "/dashboard/projects", icon: "🗂️", label: "Projetos" },
        { href: "/dashboard/reports", icon: "📄", label: "Relatórios" },
        {
          href: "/dashboard/organizations",
          icon: "👥",
          label: "Minha Organização",
        },
      ];
  }
}
