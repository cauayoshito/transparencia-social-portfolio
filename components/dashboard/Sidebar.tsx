import type { ReactNode } from "react";
import Image from "next/image";
import NavLink from "./NavLink";
import type { PrimaryRole } from "@/lib/roles";
import type { SidebarItem } from "@/lib/sidebar-menu";

type Props = {
  footer?: ReactNode;
  className?: string;
  menuItems: SidebarItem[];
  role: PrimaryRole;
  roleLabel: string;
};

/** Badge de cor por perfil */
function roleBadgeClass(role: PrimaryRole): string {
  switch (role) {
    case "INVESTOR":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    case "CONSULTANT":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "ORG":
      return "border-blue-400/30 bg-blue-400/10 text-blue-300";
  }
}

export default function Sidebar({
  footer,
  className,
  menuItems,
  role,
  roleLabel,
}: Props) {
  return (
    <aside
      className={[
        "flex h-full min-h-0 w-full max-w-full flex-shrink-0 flex-col bg-[#0f172a] text-slate-300",
        className ?? "",
      ].join(" ")}
    >
      {/* ── Header com logo ── */}
      <div className="flex items-center gap-3 border-b border-slate-700/50 p-4 sm:p-5 lg:p-6">
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-white/95 p-1 shadow-lg">
          <Image
            src="/branding/TransparenciaSocial.png"
            alt="Logo Transparência Social"
            fill
            sizes="40px"
            className="object-contain"
            priority
          />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold leading-tight tracking-wide text-white sm:text-lg">
            Transparência Social
          </h1>
          <span
            className={[
              "mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              roleBadgeClass(role),
            ].join(" ")}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Navegação dinâmica por perfil ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 sm:py-6">
        <div className="flex min-h-0 flex-col gap-1">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Menu
          </p>

          {menuItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={<span>{item.icon}</span>}
              label={item.label}
            />
          ))}

          <div className="my-4 border-t border-slate-700/50" />

          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sistema
          </p>

          <NavLink
            href="/dashboard/help"
            icon={<span>❓</span>}
            label="Ajuda"
          />
        </div>
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-slate-700/50 p-4">{footer}</div>
    </aside>
  );
}
