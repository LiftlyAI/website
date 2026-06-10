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
    <aside className="w-60 shrink-0 border-r border-iron-800 bg-iron-950 min-h-screen hidden lg:flex flex-col">
      <div className="p-5 border-b border-iron-800">
        <Link href="/dashboard" className="block">
          <LiftlyLogo size={28} className="text-chalk" />
          <div className="font-mono text-[10px] text-chalk-mute mt-2 tracking-widest">
            EST. THIS MONTH
          </div>
        </Link>
      </div>

      <nav className="flex-1 py-4">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg font-body font-medium text-sm',
                'transition-all duration-150',
                active
                  ? 'text-blood bg-blood/10 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
                  : 'text-chalk-dim hover:text-chalk hover:bg-iron-800/70',
              )}
            >
              <Icon className="w-4 h-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <form action="/api/auth/logout" method="POST" className="border-t border-iron-800">
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-5 py-4 font-body font-medium text-sm text-chalk-mute hover:text-blood hover:bg-iron-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </form>
    </aside>
  );
}
