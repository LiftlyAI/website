import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCoachSession } from '@/lib/coach-auth';
import { getSubscription } from '@/lib/limits';
import { getStripe, appUrl } from '@/lib/stripe';

// Opens the Stripe Billing Portal so a customer can change/cancel their plan or
// update payment details. `type` selects which session (athlete vs coach).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const type = body?.type === 'coach' ? 'coach' : 'athlete';

  try {
    const accountId =
      type === 'coach' ? (await getCoachSession())?.id ?? null : (await getSession())?.id ?? null;
    if (!accountId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const sub = await getSubscription(type, accountId);
    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'no billing account yet' }, { status: 400 });
    }

    const portal = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl()}/${type === 'coach' ? 'coach' : 'profile'}`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'portal failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
