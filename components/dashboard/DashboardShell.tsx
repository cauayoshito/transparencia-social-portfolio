"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { signOutAction } from "@/app/actions/auth.actions";
import type { PrimaryRole } from "@/lib/roles";
import type { SidebarItem } from "@/lib/sidebar-menu";

type Props = {
  children: ReactNode;
  role: PrimaryRole;
  roleLabel: string;
  menuItems: SidebarItem[];
};

export default function DashboardShell({
  children,
  role,
  roleLabel,
  menuItems,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarFooter = (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="truncate text-sm font-semibold text-white">
        Transparência Social
      </div>
      <div className="truncate text-xs text-slate-400">{roleLabel}</div>

      <form action={signOutAction} className="mt-3">
        <button
          type="submit"
          className="w-full rounded-lg bg-white/10 py-2 text-sm text-white transition hover:bg-white/15"
        >
          Sair
        </button>
      </form>

      <div className="mt-3 text-[10px] text-slate-500">
        © {new Date().getFullYear()} Transparência Social
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen lg:h-screen">
        <aside className="hidden lg:flex lg:w-72 lg:shrink-0">
          <Sidebar
            footer={sidebarFooter}
            menuItems={menuItems}
            role={role}
            roleLabel={roleLabel}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="min-w-0">{children}</div>
          </main>
        </div>
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] transform transition-transform duration-200 ease-out lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex h-full min-h-0 flex-col bg-[#0f172a] shadow-2xl">
          <div className="flex items-center justify-end border-b border-slate-700/50 p-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <Sidebar
              footer={sidebarFooter}
              menuItems={menuItems}
              role={role}
              roleLabel={roleLabel}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
