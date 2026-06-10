import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCoachSession } from '@/lib/coach-auth';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';
import { CoachLogoutButton } from './LogoutButton';

export default async function CoachConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');

  return (
    <div className="min-h-screen bg-iron-950">
      <header className="border-b border-iron-700 bg-iron-900/60 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-6">
          <Link href="/coach" className="flex items-center gap-3 shrink-0">
            <LiftlyLogo size={28} className="text-chalk" />
            <span className="stencil-heading text-sm text-chalk hidden sm:inline">
              Coach Console
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-body text-chalk-dim">
            <Link href="/coach" className="hover:text-chalk">
              Triage
            </Link>
            <Link href="/coach/roster" className="hover:text-chalk">
              Roster
            </Link>
            <Link href="/coach/bulk" className="hover:text-chalk">
              Bulk block
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-mono text-chalk-mute hidden md:inline">
              {coach.email}
            </span>
            <CoachLogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
