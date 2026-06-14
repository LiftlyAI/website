import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getCoachSession } from '@/lib/coach-auth';
import {
  getStripe,
  ensureCustomer,
  appUrl,
  priceProMonthly,
  priceProAnnual,
  priceCoach,
  activeClientCount,
} from '@/lib/stripe';

// Pro is billed to the athlete account; Coach is billed per active client to the
// coach account. Returns a hosted Checkout URL for the client to redirect to.
const Body = z.object({ plan: z.enum(['pro_monthly', 'pro_annual', 'coach']) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const { plan } = parsed.data;

  try {
    const stripe = getStripe();

    if (plan === 'coach') {
      const coach = await getCoachSession();
      if (!coach) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      const price = priceCoach();
      if (!price) return NextResponse.json({ error: 'coach plan not configured' }, { status: 500 });

      const customer = await ensureCustomer({
        accountType: 'coach',
        accountId: coach.id,
        email: coach.email,
      });
      const quantity = await activeClientCount(coach.id);
      const checkout = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer,
        line_items: [{ price, quantity }],
        client_reference_id: coach.id,
        subscription_data: { metadata: { accountType: 'coach', accountId: coach.id } },
        success_url: `${appUrl()}/coach?billing=success`,
        cancel_url: `${appUrl()}/coach?billing=cancel`,
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: checkout.url });
    }

    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const price = plan === 'pro_annual' ? priceProAnnual() : priceProMonthly();
    if (!price) return NextResponse.json({ error: 'pro plan not configured' }, { status: 500 });

    const customer = await ensureCustomer({
      accountType: 'athlete',
      accountId: session.id,
      email: session.email,
    });
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: session.id,
      subscription_data: { metadata: { accountType: 'athlete', accountId: session.id } },
      success_url: `${appUrl()}/profile?billing=success`,
      cancel_url: `${appUrl()}/profile?billing=cancel`,
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'checkout failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
