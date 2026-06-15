import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getOrCreateCoach, setCoachSession } from '@/lib/coach-auth';

// Google sign-in for coaches. The coach console does NOT run on Supabase Auth —
// it has its own pl_coach_session cookie (see lib/coach-auth). So here we use
// Supabase purely as a one-shot Google identity verifier: exchange the code,
// read the verified email, mint our own coach session, then drop the Supabase
// session locally so this Google login doesn't also provision a lifter
// (athletes) row via the lifter getSession() on a later request.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const email = data?.user?.email;
    if (!error && email) {
      const meta = data.user.user_metadata ?? {};
      const name = (meta.full_name ?? meta.name ?? null) as string | null;
      const coach = await getOrCreateCoach(email, name ?? undefined);
      await setCoachSession(coach.id);
      // Clear only this device's Supabase cookies (no network revoke needed).
      await supabase.auth.signOut({ scope: 'local' });
      return NextResponse.redirect(`${origin}/coach`);
    }
  }

  return NextResponse.redirect(`${origin}/coach/login?error=google_failed`);
}
