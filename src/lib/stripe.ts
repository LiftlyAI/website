// Stripe layer — lazy client singleton (mirrors the provider pattern in ai.ts),
// price<->plan mapping, and the helpers checkout/webhook/roster routes share.
// We use hosted Checkout + the Billing Portal (redirect flows), so no Stripe.js
// or publishable key is needed on the client.

import Stripe from 'stripe';
import { queryOne } from './db';
import { getSubscription, upsertSubscription, type AccountType, type Plan } from './limits';

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set — add it to .env.local.');
  _stripe = new Stripe(key);
  return _stripe;
}

// Resolved at call time so env changes are picked up on server restart.
export const priceProMonthly = (): string => process.env.STRIPE_PRICE_PRO_MONTHLY ?? '';
export const priceProAnnual = (): string => process.env.STRIPE_PRICE_PRO_ANNUAL ?? '';
export const priceCoach = (): string => process.env.STRIPE_PRICE_COACH ?? '';

// --- Margin assumption (sanity-check before re-tiering PLAN_CAPS) -------------
// Form-check unit cost is dominated by the Modal GPU pose pass in cv-service:
// ~T4 at ~$0.000164/sec * ~20s/clip ≈ $0.003/clip. LLM coaching pass adds
// ~$0.0005/clip on Gemini Flash. Round to ~$0.005/clip all-in (CV + LLM + DB).
//
// Pro is $12/mo for 100 checks/mo → ~$0.50 of compute/user/mo, ≥95% gross margin
// before Stripe fees (2.9% + $0.30 ≈ $0.65 on $12 → ~$10.85 net). Coach is
// $20/seat/mo for 200 checks/seat/mo + unlimited AI; AI calls are cheap
// (~$0.0005 each), so even a heavy 500-call/mo seat costs <$1.50 of compute,
// still ~90% gross margin per seat. Free is hard-capped at 3 checks/wk so a
// fully-utilized free user costs ≤$0.06/mo to serve.
//
// If you bump PLAN_CAPS limits in limits.ts, re-run those numbers against the
// current Modal price (cv-service/README.md tracks it) before shipping.

export function priceToPlan(priceId: string | null | undefined): Plan {
  if (!priceId) return 'free';
  if (priceId === priceProMonthly() || priceId === priceProAnnual()) return 'pro';
  if (priceId === priceCoach()) return 'coach';
  return 'free';
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

/** Get (or lazily create) the Stripe customer for a billing account, persisting
 *  its id on the subscriptions row so later webhooks can map back to us. */
export async function ensureCustomer(args: {
  accountType: AccountType;
  accountId: string;
  email: string;
}): Promise<string> {
  const existing = await getSubscription(args.accountType, args.accountId);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: args.email,
    metadata: { accountType: args.accountType, accountId: args.accountId },
  });
  await upsertSubscription({
    accountType: args.accountType,
    accountId: args.accountId,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: existing?.stripe_subscription_id ?? null,
    plan: existing?.plan ?? 'free',
    status: existing?.status ?? 'inactive',
    quantity: existing?.quantity ?? 1,
    currentPeriodEnd: existing?.current_period_end ?? null,
  });
  return customer.id;
}

/** Active clients on a coach's roster — the per-seat quantity they're billed for
 *  (floored at 1 so Checkout always has a valid line item). */
export async function activeClientCount(coachId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM coach_athletes WHERE coach_id = ? AND status = 'active'",
    [coachId],
  );
  return Math.max(1, r?.n ?? 1);
}

/** Keep a coach's per-seat subscription quantity in sync with their active
 *  roster. Best-effort: never throws into roster operations — Stripe is
 *  reconciled on the next webhook anyway. */
export async function syncCoachSeats(coachId: string): Promise<void> {
  try {
    const sub = await getSubscription('coach', coachId);
    if (!sub?.stripe_subscription_id || sub.plan !== 'coach') return;
    const stripe = getStripe();
    const seats = await activeClientCount(coachId);
    const full = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = full.items.data[0];
    if (!item || item.quantity === seats) return;
    await stripe.subscriptionItems.update(item.id, {
      quantity: seats,
      proration_behavior: 'create_prorations',
    });
  } catch {
    /* swallow — seat drift self-heals on the next subscription.updated webhook */
  }
}
