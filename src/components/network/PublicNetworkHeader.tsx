import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';

// Shared top bar for the no-auth network surfaces (discovery hub + public
// profiles). Async so the CTA reflects whether a lifter is already signed in.
export async function PublicNetworkHeader() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-iron-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <LiftlyLogo size={28} className="text-chalk transition-colors group-hover:text-blood-glow" />
          <span className="stencil-heading hidden text-sm text-chalk sm:inline">Liftly</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-body">
          <Link
            href="/coaches"
            className="rounded-lg px-3 py-1.5 text-chalk-dim transition-all hover:bg-iron-800/70 hover:text-chalk"
          >
            Find a Coach
          </Link>
          <Link
            href="/coaches/leaderboard"
            className="rounded-lg px-3 py-1.5 text-chalk-dim transition-all hover:bg-iron-800/70 hover:text-chalk"
          >
            Leaderboard
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-body text-chalk-dim transition-all hover:text-chalk"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-body text-chalk-dim transition-all hover:text-chalk"
              >
                Log in
              </Link>
              <Link
                href="/coach/login"
                className="rounded-lg border border-iron-700 px-3 py-1.5 text-sm font-body text-chalk transition-all hover:border-blood/60"
              >
                For Coaches
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
