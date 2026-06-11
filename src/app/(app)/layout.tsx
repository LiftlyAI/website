import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';

// Every page in this group is per-user and session-gated (getSession reads the
// auth cookie below), so there is nothing to statically prerender. Without this,
// `next build` tries to prerender them with no request context and
// requireSession throws UNAUTHORIZED, failing the build.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!session.hasProfile) redirect('/onboarding');
  return <AppShell>{children}</AppShell>;
}
