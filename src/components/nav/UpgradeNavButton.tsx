'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', coach: 'Coach' };

// Always-visible billing affordance for the nav. Free accounts get a bright
// "Upgrade" CTA → /pricing; paying accounts get a subtle plan chip → manage.
export function UpgradeNavButton({
  account = 'athlete',
  className,
}: {
  account?: 'athlete' | 'coach';
  className?: string;
}) {
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setPlan(account === 'coach' ? d?.coach?.plan ?? 'free' : d?.athlete?.plan ?? 'free');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [account]);

  if (plan == null) return null; // don't flash until we know the plan

  if (plan !== 'free') {
    return (
      <Link
        href={account === 'coach' ? '/coach' : '/profile'}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-iron-700 px-3 py-2 font-mono text-xs text-chalk-mute transition-colors hover:border-blood/50 hover:text-chalk',
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-blood shadow-glow-sm" />
        {PLAN_LABEL[plan]} plan · Manage
      </Link>
    );
  }

  return (
    <Link
      href="/pricing"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg bg-blood px-3 py-2 font-body text-sm font-semibold text-white shadow-glow-sm transition-all hover:bg-blood-glow',
        className,
      )}
    >
      <Sparkles className="h-4 w-4" />
      Upgrade
    </Link>
  );
}
