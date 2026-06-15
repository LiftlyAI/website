import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, priceToPlan } from '@/lib/stripe';
import { upsertSubscription, type AccountType, type Plan } from '@/lib/limits';

// Stripe is the source of truth for subscription state; this endpoint syncs it
// into our `subscriptions` table. MUST verify the signature over the RAW body,
// so we read req.text() and never req.json(). Node runtime (Stripe SDK needs it).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 400 });
  }

  const raw = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'bad signature';
    return NextResponse.json({ error: `signature verification failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const cs = event.data.object as Stripe.Checkout.Session;
        if (cs.subscription) {
          const id = typeof cs.subscription === 'string' ? cs.subscription : cs.subscription.id;
          await syncFromSubscription(await stripe.subscriptions.retrieve(id));
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const ref = refFrom(sub);
        if (ref) {
          await upsertSubscription({
            accountType: ref.accountType,
            accountId: ref.accountId,
            stripeCustomerId: customerId(sub),
            stripeSubscriptionId: sub.id,
            plan: 'free',
            status: 'canceled',
            quantity: 1,
            currentPeriodEnd: periodEndMs(sub),
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'handler error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// We stamp {accountType, accountId} onto subscription_data.metadata at checkout,
// so every subscription event can be mapped back to our account without a lookup.
function refFrom(sub: Stripe.Subscription): { accountType: AccountType; accountId: string } | null {
  const at = sub.metadata?.accountType;
  const id = sub.metadata?.accountId;
  if ((at === 'athlete' || at === 'coach') && id) return { accountType: at, accountId: id };
  return null;
}

function customerId(sub: Stripe.Subscription): string {
  return typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
}

// `current_period_end` lives on the subscription in older API versions and on the
// item in newer ones — read defensively so we work across both.
function periodEndMs(sub: Stripe.Subscription): number | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const sec =
    item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return sec ? sec * 1000 : null;
}

async function syncFromSubscription(sub: Stripe.Subscription): Promise<void> {
  const ref = refFrom(sub);
  if (!ref) return;
  const item = sub.items.data[0];
  const plan: Plan = priceToPlan(item?.price?.id ?? null);
  await upsertSubscription({
    accountType: ref.accountType,
    accountId: ref.accountId,
    stripeCustomerId: customerId(sub),
    stripeSubscriptionId: sub.id,
    plan: sub.status === 'canceled' ? 'free' : plan,
    status: sub.status,
    quantity: item?.quantity ?? 1,
    currentPeriodEnd: periodEndMs(sub),
  });
}
