import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCoachSession } from '@/lib/coach-auth';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';
import { PageTransition } from '@/components/layout/PageTransition';
import { CoachLogoutButton } from './LogoutButton';
import { CoachNav } from './CoachNav';
import { UpgradeNavButton } from '@/components/nav/UpgradeNavButton';

export default async function CoachConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');

  return (
    <div className="min-h-screen bg-iron-950">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-iron-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <Link href="/coach" className="group flex shrink-0 items-center gap-3">
            <LiftlyLogo size={28} className="text-chalk transition-colors group-hover:text-blood-glow" />
            <span className="stencil-heading hidden text-sm text-chalk sm:inline">
              Coach Console
            </span>
          </Link>
          <CoachNav />
          <div className="ml-auto flex items-center gap-3">
            <UpgradeNavButton account="coach" className="hidden sm:inline-flex" />
            <span className="hidden font-mono text-xs text-chalk-mute md:inline">
              {coach.email}
            </span>
            <CoachLogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
