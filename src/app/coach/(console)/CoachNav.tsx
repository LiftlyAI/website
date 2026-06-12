'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/coach', label: 'Triage', exact: true },
  { href: '/coach/roster', label: 'Roster' },
  { href: '/coach/bulk', label: 'Bulk block' },
];

export function CoachNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm font-body">
      {links.map((l) => {
        const active = l.exact
          ? pathname === l.href || pathname?.startsWith('/coach/clients')
          : pathname?.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-lg px-3 py-1.5 transition-all duration-200',
              active
                ? 'bg-blood/15 text-chalk shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
                : 'text-chalk-dim hover:bg-iron-800/70 hover:text-chalk',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
