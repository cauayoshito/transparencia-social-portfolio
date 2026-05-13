'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, LogOut, Menu, Search } from 'lucide-react';
import Badge from '@/components/ui/Badge';

type UserInfo = {
  name: string;
  role: string;
  org: string;
};

type TopbarProps = {
  user: UserInfo;
  onMenuClick: () => void;
  onLogout: () => void;
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function toTitleCase(value: string) {
  return value
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function buildProjectName(projectId?: string) {
  if (!projectId) return 'Projeto';
  const normalized = projectId.replace(/^proj-?/i, '');
  return `Projeto ${normalized.toUpperCase()}`;
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return [{ label: 'Home' }, { label: 'Visao Geral' }];
  }

  if (pathname === '/projetos') {
    return [{ label: 'Home' }, { label: 'Projetos' }];
  }

  if (pathname === '/investidor' || pathname.startsWith('/investidor/')) {
    return [{ label: 'Home', href: '/dashboard' }, { label: 'Investidor' }];
  }

  const reportMatch = pathname.match(/^\/projetos\/([^/]+)\/relatorios\/([^/]+)$/);
  if (reportMatch) {
    const [, projectId, period] = reportMatch;
    return [
      { label: 'Home', href: '/dashboard' },
      { label: 'Projetos', href: '/projetos' },
      { label: buildProjectName(projectId), href: `/projetos/${projectId}` },
      { label: 'Relatorios', href: `/projetos/${projectId}/relatorios` },
      { label: toTitleCase(period) },
    ];
  }

  const reportsListMatch = pathname.match(/^\/projetos\/([^/]+)\/relatorios$/);
  if (reportsListMatch) {
    const [, projectId] = reportsListMatch;
    return [
      { label: 'Home', href: '/dashboard' },
      { label: 'Projetos', href: '/projetos' },
      { label: buildProjectName(projectId), href: `/projetos/${projectId}` },
      { label: 'Relatorios' },
    ];
  }

  if (pathname.startsWith('/projetos/')) {
    return [{ label: 'Home', href: '/dashboard' }, { label: 'Projetos' }];
  }

  return [{ label: 'Home' }];
}

export default function Topbar({ user, onMenuClick, onLogout }: TopbarProps) {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-4">
        <button type="button" className="text-slate-500 hover:text-primary lg:hidden" onClick={onMenuClick}>
          <Menu className="size-5" />
        </button>
        <div className="hidden items-center text-sm text-slate-500 sm:flex">
          {breadcrumbs.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center">
              {index > 0 && <ChevronRight className="mx-2 size-4" />}
              {item.href ? (
                <Link href={item.href} className="transition-colors hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-slate-900">{item.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="group rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100" type="button">
          <Search className="size-5" />
        </button>

        <button className="group relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100" type="button">
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end md:flex">
            <span className="text-sm font-semibold text-slate-900">{user.org}</span>
            <Badge variant="primary">Organizacao</Badge>
          </div>

          <div className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
            {getInitials(user.name)}
          </div>

          <button
            className="ml-1 text-slate-400 transition-colors hover:text-red-600"
            title="Sair"
            type="button"
            onClick={onLogout}
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
