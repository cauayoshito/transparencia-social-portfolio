'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  CircleHelp,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  FolderOpen,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';

type UserInfo = {
  name: string;
  role: string;
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  user: UserInfo;
};

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string) => boolean;
};

type SettingsItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const mainItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/'),
  },
  {
    id: 'organizacoes',
    label: 'Organizacoes',
    href: '#',
    icon: Building2,
    match: (pathname) => pathname === '/organizacoes' || pathname.startsWith('/organizacoes/'),
  },
  {
    id: 'projetos',
    label: 'Projetos',
    href: '/projetos',
    icon: FolderOpen,
    match: (pathname) => pathname === '/projetos' || pathname.startsWith('/projetos/'),
  },
  {
    id: 'relatorios',
    label: 'Relatorios',
    href: '/relatorios',
    icon: BarChart3,
    match: (pathname) => pathname.includes('/relatorios'),
  },
  {
    id: 'investidor',
    label: 'Painel do Investidor',
    href: '/investidor',
    icon: CircleUserRound,
    match: (pathname) => pathname === '/investidor' || pathname.startsWith('/investidor/'),
  },
  {
    id: 'seguranca',
    label: 'Seguranca',
    href: '#',
    icon: ShieldCheck,
    match: (pathname) => pathname === '/seguranca' || pathname.startsWith('/seguranca/'),
  },
];

const settingsItems: SettingsItem[] = [
  { label: 'Sistema', href: '#', icon: Settings },
  { label: 'Ajuda', href: '#', icon: CircleHelp },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function extractProjectId(pathname: string) {
  if (!pathname.startsWith('/projetos/')) {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const projectId = segments[1];
  return projectId || null;
}

export default function Sidebar({ isOpen, onClose, onLogout, user }: SidebarProps) {
  const pathname = usePathname();
  const projectId = extractProjectId(pathname);
  const reportsHref = projectId ? `/projetos/${projectId}/relatorios` : '/projetos';

  return (
    <>
      {isOpen && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onClose}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col bg-sidebar-bg text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6 lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative size-9 overflow-hidden rounded-lg border border-white/20 bg-white p-1">
              <Image
                src="/branding/TransparenciaSocial.png"
                alt="Logo Transparência Social"
                fill
                sizes="36px"
                className="object-contain"
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <h1 className="truncate text-base font-bold leading-tight tracking-wide text-white">Transparência Social</h1>
              <p className="text-xs font-normal text-blue-200">Gestão Social</p>
            </div>
          </div>
          <button type="button" className="text-blue-100 lg:hidden" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(pathname);
            const href = item.id === 'relatorios' ? reportsHref : item.href;
            return (
              <Link
                key={item.label}
                href={href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-blue-900/20'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
                onClick={onClose}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="mt-8 px-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-300">Configuracoes</p>
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100 transition-all duration-200 hover:bg-white/10 hover:text-white"
                  onClick={onClose}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-xs font-bold text-white shadow-inner">
              {getInitials(user.name)}
            </div>
            <div className="flex min-w-0 flex-col overflow-hidden">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-blue-200">{user.role}</p>
            </div>
            <button
              type="button"
              title="Sair"
              className="ml-auto text-blue-100 transition-colors hover:text-white"
              onClick={onLogout}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
