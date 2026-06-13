import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

// Handles every OAuth/email code exchange: Google sign-in, and the email
// verification link. After the session cookie is set we route by profile state.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Returning lifters (e.g. Google sign-in) already have a profile → straight
      // to the dashboard. New accounts have none yet and start in onboarding.
      // getSession also lazily provisions the athletes row on first sign-in.
      const session = await getSession();
      return NextResponse.redirect(`${origin}${session?.hasProfile ? '/dashboard' : '/onboarding'}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
