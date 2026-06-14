import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCoachSession } from '@/lib/coach-auth';
import { athleteUsage, coachEntitlement } from '@/lib/limits';

// Plan + live usage for the current session(s). The form-check client reads this
// as a pre-flight before the (expensive) Modal upload, and the profile/coach
// surfaces render meters from it.
export async function GET() {
  const [session, coach] = await Promise.all([getSession(), getCoachSession()]);
  if (!session && !coach) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const out: Record<string, unknown> = {};
  if (session) out.athlete = await athleteUsage(session.id);
  if (coach) {
    const ent = await coachEntitlement(coach.id);
    out.coach = { plan: ent.plan };
  }
  return NextResponse.json(out);
}
