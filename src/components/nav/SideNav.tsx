'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Dumbbell,
  Video,
  Apple,
  TrendingUp,
  MessageSquare,
  User,
  Info,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';
import { UpgradeNavButton } from '@/components/nav/UpgradeNavButton';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/program', label: 'Program', icon: Dumbbell },
  { href: '/formcheck', label: 'Form Check', icon: Video },
  { href: '/nutrition', label: 'Nutrition', icon: Apple },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/chat', label: 'Coach', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/about', label: 'About', icon: Info },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-iron-800 bg-iron-950/80 backdrop-blur-xl lg:flex">
      <div className="border-b border-iron-800 p-5">
        <Link href="/dashboard" className="group block">
          <LiftlyLogo size={28} className="text-chalk transition-colors group-hover:text-blood-glow" />
          <div className="mt-2 font-mono text-[10px] tracking-[0.3em] text-chalk-mute">
            AI POWERLIFTING COACH
          </div>
        </Link>
      </div>

      <nav className="stagger flex-1 overflow-y-auto py-4">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              data-active={active || undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'side-link mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm font-medium',
                'transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-blood/15 to-transparent text-chalk shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]'
                  : 'text-chalk-dim hover:translate-x-0.5 hover:bg-iron-800/70 hover:text-chalk',
              )}
            >
              <Icon className={cn('h-4 w-4', active && 'text-blood')} />
              {l.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blood shadow-glow-sm" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <UpgradeNavButton className="w-full" />
      </div>

      <form action="/api/auth/logout" method="POST" className="border-t border-iron-800">
        <button
          type="submit"
          className="group flex w-full items-center gap-3 px-5 py-4 font-body text-sm font-medium text-chalk-mute transition-colors hover:bg-iron-900 hover:text-blood"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Sign Out
        </button>
      </form>
    </aside>
  );
}
