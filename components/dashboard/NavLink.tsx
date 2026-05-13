"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type Props = {
  href: string;
  icon?: ReactNode;
  label: string;
};

export default function NavLink({ href, icon, label }: Props) {
  const pathname = usePathname();

  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  useEffect(() => {
    const menu = document.getElementById("dashboard-menu");
    if (menu instanceof HTMLInputElement) {
      menu.checked = false;
    }
  }, [pathname]);

  function closeMenu() {
    const menu = document.getElementById("dashboard-menu");
    if (menu instanceof HTMLInputElement) {
      menu.checked = false;
    }
  }

  return (
    <Link
      href={href}
      onClick={closeMenu}
      className={[
        "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <span className="text-[18px] opacity-90">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
