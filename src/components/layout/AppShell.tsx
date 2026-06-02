import { ReactNode } from 'react';
import { SideNav } from '@/components/nav/SideNav';
import { MobileNav } from '@/components/nav/MobileNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      {/* pb clears the fixed bottom tab bar on mobile */}
      <main className="flex-1 overflow-x-hidden pb-24 lg:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
