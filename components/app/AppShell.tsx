'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/app/Sidebar';
import Topbar from '@/components/app/Topbar';
import { createClient } from '@/lib/supabase/client';

type UserInfo = {
  name: string;
  role: string;
  org: string;
};

type AppShellProps = {
  children: ReactNode;
  user: UserInfo;
};

export default function AppShell({ children, user }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light text-slate-900 antialiased dark:bg-background-dark dark:text-slate-100">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        user={{ name: user.name, role: user.role }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onMenuClick={() => setSidebarOpen(true)} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
