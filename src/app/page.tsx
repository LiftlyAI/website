import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LandingExperience } from '@/components/landing/LandingExperience';

export default async function Landing() {
  const session = await getSession();
  if (session) {
    redirect(session.hasProfile ? '/dashboard' : '/onboarding');
  }

  return <LandingExperience />;
}
