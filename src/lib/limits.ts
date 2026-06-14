// Billing entitlements + usage metering.
//
// Two metered resources:
//   1. form checks  — counted from the existing `form_checks` table (already the
//      source of truth, written by /api/formcheck).
//   2. AI/LLM calls — the "Gemini API key uses"; counted from `usage_events`.
//
// Plans: 'free' (default, ALL features unlocked but metered), 'pro' ($12/mo or
// $99/yr), and the coach-granted 'coach' tier — a paying coach's active clients
// get 200 form checks/month + unlimited AI. Entitlement is resolved live on
// every request, so an upgrade or cancel takes effect immediately.
//
// The pure functions here (resolveAthletePlan, capsFor, period math) carry the
// policy and are unit-tested in tests/limits.test.ts; the async functions are
// thin DB wrappers around them.

import { execute, queryOne, uuid } from './db';

export type Plan = 'free' | 'pro' | 'coach';
export type AccountType = 'athlete' | 'coach';
export type MeterWindow = 'week' | 'month';

export interface MeterCap {
  /** null === unlimited */
  limit: number | null;
  window: MeterWindow;
}
export interface PlanCaps {
  formChecks: MeterCap;
  ai: MeterCap;
}

// --- Tunable caps. Re-tier by editing these single constants. ----------------
// FREE form checks default to 3/week; bump to 10 here to match the original spec.
export const PLAN_CAPS: Record<Plan, PlanCaps> = {
  free: { formChecks: { limit: 3, window: 'week' }, ai: { limit: 30, window: 'week' } },
  pro: { formChecks: { limit: 100, window: 'month' }, ai: { limit: 600, window: 'month' } },
  coach: { formChecks: { limit: 200, window: 'month' }, ai: { limit: null, window: 'month' } },
};

export function capsFor(plan: Plan): PlanCaps {
  return PLAN_CAPS[plan];
}

// Stripe statuses we treat as "entitled". `past_due` keeps access during the
// dunning grace window; access is revoked on customer.subscription.deleted.
const ENTITLED = new Set(['active', 'trialing', 'past_due']);
export function isActiveStatus(status: string | null | undefined): boolean {
  return !!status && ENTITLED.has(status);
}

// --- Pure plan resolution (unit-tested) --------------------------------------
// A coached athlete inherits their coach's active 'coach' plan (which covers
// the whole roster); otherwise their own active 'pro'; otherwise 'free'.
export function resolveAthletePlan(args: {
  ownPlan?: Plan | null;
  ownStatus?: string | null;
  coachPlan?: Plan | null;
  coachStatus?: string | null;
}): Plan {
  if (args.coachPlan === 'coach' && isActiveStatus(args.coachStatus)) return 'coach';
  if (args.ownPlan === 'pro' && isActiveStatus(args.ownStatus)) return 'pro';
  return 'free';
}

// --- Pure period math (unit-tested). UTC; week starts Monday. ----------------
export function startOfMonthUTC(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}
export function startOfIsoWeekUTC(nowMs: number): number {
  const d = new Date(nowMs);
  const sinceMonday = (d.getUTCDay() + 6) % 7; // 0=Sun..6=Sat -> Mon=0
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return midnight - sinceMonday * 24 * 60 * 60 * 1000;
}
export function windowStart(window: MeterWindow, nowMs: number): number {
  return window === 'week' ? startOfIsoWeekUTC(nowMs) : startOfMonthUTC(nowMs);
}

// --- Subscription data layer -------------------------------------------------
export interface SubscriptionRow {
  account_type: AccountType;
  account_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: string;
  quantity: number;
  current_period_end: number | null;
}

export async function getSubscription(
  accountType: AccountType,
  accountId: string,
): Promise<SubscriptionRow | undefined> {
  return queryOne<SubscriptionRow>(
    `SELECT account_type, account_id, stripe_customer_id, stripe_subscription_id,
            plan, status, quantity, current_period_end
       FROM subscriptions WHERE account_type = ? AND account_id = ?`,
    [accountType, accountId],
  );
}

export async function upsertSubscription(row: {
  accountType: AccountType;
  accountId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan: Plan;
  status: string;
  quantity?: number;
  currentPeriodEnd?: number | null;
}): Promise<void> {
  const now = Date.now();
  await execute(
    `INSERT INTO subscriptions
       (id, account_type, account_id, stripe_customer_id, stripe_subscription_id,
        plan, status, quantity, current_period_end, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (account_type, account_id) DO UPDATE SET
       stripe_customer_id     = COALESCE(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
       stripe_subscription_id = excluded.stripe_subscription_id,
       plan                   = excluded.plan,
       status                 = excluded.status,
       quantity               = excluded.quantity,
       current_period_end     = excluded.current_period_end,
       updated_at             = excluded.updated_at`,
    [
      uuid(),
      row.accountType,
      row.accountId,
      row.stripeCustomerId ?? null,
      row.stripeSubscriptionId ?? null,
      row.plan,
      row.status,
      row.quantity ?? 1,
      row.currentPeriodEnd ?? null,
      now,
      now,
    ],
  );
}

// --- Entitlement resolution --------------------------------------------------
export interface Entitlement {
  plan: Plan;
  caps: PlanCaps;
}

export async function athleteEntitlement(athleteId: string): Promise<Entitlement> {
  const a = await queryOne<{ coached_by: string | null }>(
    'SELECT coached_by FROM athletes WHERE id = ?',
    [athleteId],
  );
  let coachPlan: Plan | null = null;
  let coachStatus: string | null = null;
  if (a?.coached_by) {
    const cs = await getSubscription('coach', a.coached_by);
    coachPlan = cs?.plan ?? null;
    coachStatus = cs?.status ?? null;
  }
  const own = await getSubscription('athlete', athleteId);
  const plan = resolveAthletePlan({
    ownPlan: own?.plan ?? null,
    ownStatus: own?.status ?? null,
    coachPlan,
    coachStatus,
  });
  return { plan, caps: capsFor(plan) };
}

export async function coachEntitlement(coachId: string): Promise<Entitlement> {
  const own = await getSubscription('coach', coachId);
  const active = own?.plan === 'coach' && isActiveStatus(own?.status);
  const plan: Plan = active ? 'coach' : 'free';
  return { plan, caps: capsFor(plan) };
}

// --- Counting ----------------------------------------------------------------
export async function countFormChecks(athleteId: string, sinceMs: number): Promise<number> {
  const r = await queryOne<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM form_checks WHERE athlete_id = ? AND created_at >= ?',
    [athleteId, sinceMs],
  );
  return r?.n ?? 0;
}

export async function countAiCalls(
  accountType: AccountType,
  accountId: string,
  sinceMs: number,
): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM usage_events
       WHERE account_type = ? AND account_id = ? AND kind = 'ai_call' AND created_at >= ?`,
    [accountType, accountId, sinceMs],
  );
  return r?.n ?? 0;
}

export async function recordAiCall(
  accountType: AccountType,
  accountId: string,
  feature: string,
): Promise<void> {
  await execute(
    `INSERT INTO usage_events (id, account_type, account_id, kind, feature, created_at)
     VALUES (?, ?, ?, 'ai_call', ?, ?)`,
    [uuid(), accountType, accountId, feature, Date.now()],
  );
}

// --- Quota gate --------------------------------------------------------------
export interface QuotaInfo {
  meter: 'form_check' | 'ai_call';
  plan: Plan;
  used: number;
  limit: number;
  window: MeterWindow;
}

/** Thrown by the assert* helpers when a metered resource is exhausted. Routes
 *  should map this to HTTP 402 (Payment Required). */
export class QuotaError extends Error {
  readonly status = 402;
  constructor(readonly info: QuotaInfo) {
    super(
      `${info.meter} quota reached (${info.used}/${info.limit} per ${info.window} on ${info.plan} plan)`,
    );
    this.name = 'QuotaError';
  }
}

export async function assertFormCheckQuota(athleteId: string): Promise<Entitlement> {
  const ent = await athleteEntitlement(athleteId);
  const cap = ent.caps.formChecks;
  if (cap.limit == null) return ent;
  const used = await countFormChecks(athleteId, windowStart(cap.window, Date.now()));
  if (used >= cap.limit) {
    throw new QuotaError({ meter: 'form_check', plan: ent.plan, used, limit: cap.limit, window: cap.window });
  }
  return ent;
}

export async function assertAiQuota(
  accountType: AccountType,
  accountId: string,
): Promise<Entitlement> {
  const ent =
    accountType === 'athlete'
      ? await athleteEntitlement(accountId)
      : await coachEntitlement(accountId);
  const cap = ent.caps.ai;
  if (cap.limit == null) return ent;
  const used = await countAiCalls(accountType, accountId, windowStart(cap.window, Date.now()));
  if (used >= cap.limit) {
    throw new QuotaError({ meter: 'ai_call', plan: ent.plan, used, limit: cap.limit, window: cap.window });
  }
  return ent;
}

// --- Usage summary (for /api/usage and the UI meters) ------------------------
export interface MeterUsage {
  used: number;
  limit: number | null;
  window: MeterWindow;
  remaining: number | null;
}
export interface UsageSummary {
  plan: Plan;
  formChecks: MeterUsage;
  ai: MeterUsage;
}

function meter(used: number, cap: MeterCap): MeterUsage {
  return {
    used,
    limit: cap.limit,
    window: cap.window,
    remaining: cap.limit == null ? null : Math.max(0, cap.limit - used),
  };
}

export async function athleteUsage(athleteId: string): Promise<UsageSummary> {
  const ent = await athleteEntitlement(athleteId);
  const now = Date.now();
  const [fcUsed, aiUsed] = await Promise.all([
    countFormChecks(athleteId, windowStart(ent.caps.formChecks.window, now)),
    countAiCalls('athlete', athleteId, windowStart(ent.caps.ai.window, now)),
  ]);
  return {
    plan: ent.plan,
    formChecks: meter(fcUsed, ent.caps.formChecks),
    ai: meter(aiUsed, ent.caps.ai),
  };
}
