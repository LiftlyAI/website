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
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/program', label: 'Program', icon: Dumbbell },
  { href: '/formcheck', label: 'Form Check', icon: Video },
  { href: '/nutrition', label: 'Nutrition', icon: Apple },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/chat', label: 'Coach', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-iron-800 bg-iron-950 min-h-screen flex flex-col">
      <div className="p-5 border-b border-iron-800">
        <Link href="/dashboard" className="block">
          <div className="stencil-heading text-2xl text-chalk leading-none">IRON</div>
          <div className="stencil-heading text-2xl text-blood leading-none">LEDGER</div>
          <div className="font-mono text-[10px] text-chalk-mute mt-1 tracking-widest">
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
                'flex items-center gap-3 px-5 py-3 stencil-heading text-sm tracking-widest',
                'border-l-2 transition-colors',
                active
                  ? 'text-blood border-blood bg-iron-900'
                  : 'text-chalk-dim border-transparent hover:text-chalk hover:bg-iron-900/50 hover:border-iron-600',
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
          className="w-full flex items-center gap-3 px-5 py-4 stencil-heading text-sm tracking-widest text-chalk-mute hover:text-blood hover:bg-iron-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </form>
    </aside>
  );
}
