import { ReactNode } from 'react';
import { SideNav } from '@/components/nav/SideNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
