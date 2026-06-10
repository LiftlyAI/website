'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Dumbbell,
  Video,
  MessageSquare,
  MoreHorizontal,
  Apple,
  TrendingUp,
  User,
  Info,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 4 thumb-reachable primaries + a "More" sheet for the rest
// (bottom-nav max 5 items — Material/HIG).
const primary = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/program', label: 'Program', icon: Dumbbell },
  { href: '/formcheck', label: 'Form', icon: Video },
  { href: '/chat', label: 'Coach', icon: MessageSquare },
];

const secondary = [
  { href: '/nutrition', label: 'Nutrition', icon: Apple },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/about', label: 'About', icon: Info },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = secondary.some((l) => pathname?.startsWith(l.href));

  return (
    <>
      {/* "More" sheet — slides up from the trigger region with a dismiss scrim */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="More navigation">
          <button
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
          />
          <div className="absolute bottom-0 inset-x-0 bg-iron-900 border-t border-iron-700 rounded-t-lg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-body font-semibold text-sm text-chalk-dim">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="p-2 -m-2 text-chalk-mute hover:text-chalk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {secondary.map((l) => {
                const Icon = l.icon;
                const active = pathname?.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex flex-col items-center gap-2 py-4 rounded-sm chalk-border transition-colors',
                      active ? 'text-blood border-blood' : 'text-chalk-dim hover:text-chalk',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-body font-medium text-xs">{l.label}</span>
                  </Link>
                );
              })}
            </div>
            <form action="/api/auth/logout" method="POST" className="mt-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 font-body font-medium text-xs text-chalk-mute hover:text-blood chalk-border transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom tab bar — phones/tablets only; sidebar takes over at lg+ */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-iron-950/95 backdrop-blur border-t border-iron-800 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5">
          {primary.map((l) => {
            const Icon = l.icon;
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 transition-colors',
                  active ? 'text-blood' : 'text-chalk-mute hover:text-chalk',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-mono tracking-wide">{l.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              'flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 transition-colors',
              moreActive ? 'text-blood' : 'text-chalk-mute hover:text-chalk',
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-mono tracking-wide">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
