"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Organizações", href: "/dashboard/organizations" },
  { label: "Projetos", href: "/dashboard/projects" },
  { label: "Relatórios", href: "/dashboard/reports" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">PHI Sistema</p>
          <p className="mt-1 text-sm text-slate-500">Administração Filantrópica</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-sm font-medium text-slate-900">Ambiente</p>
          <p className="mt-1 text-xs text-slate-500">Responsivo e estável no mobile</p>
        </div>
      </div>
    </div>
  );
}