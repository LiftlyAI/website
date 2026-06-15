import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdmin } from '@/lib/admin-auth';
import { LiftlyLogo } from '@/components/ui/LiftlyLogo';
import { PageTransition } from '@/components/layout/PageTransition';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'Verification' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/reports', label: 'Reports' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  // Not an admin (or not logged in as a coach on the allowlist) → bounce out.
  if (!admin) redirect('/coach/login');

  return (
    <div className="min-h-screen bg-iron-950">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-iron-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <Link href="/admin" className="group flex shrink-0 items-center gap-3">
            <LiftlyLogo size={28} className="text-chalk transition-colors group-hover:text-blood-glow" />
            <span className="stencil-heading hidden text-sm text-chalk sm:inline">Admin</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-body">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-chalk-dim transition-all hover:bg-iron-800/70 hover:text-chalk"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto hidden font-mono text-xs text-chalk-mute md:inline">
            {admin.email}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
