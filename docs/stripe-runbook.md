# Stripe billing — test-mode setup + E2E verification runbook

Mirror of the locked spec in the billing PR. Execute this end-to-end against a
fresh Stripe Test-mode account to take the feature from "compiles" to "verified
working." Capture screenshots / `stripe listen` logs as evidence and paste the
five verification snippets into the PR description.

> **Test mode only.** Use keys that start with `sk_test_` and `whsec_...` from
> a Stripe test-mode workspace. Never commit secrets.

---

## 0. Prereqs

- Local dev server can boot: `npm install && npm run dev` works on `http://localhost:3000`.
- `cv-service/` is running (or stub it — the quota gate fires before the CV upload).
- Stripe CLI installed: `stripe --version` (≥ 1.19).
- `psql` (or Supabase SQL editor) for the DB assertions in §3.

## 1. Create the Prices in Stripe (Test mode)

Two ways — either is fine, the CLI is reproducible:

### Option A — Dashboard

1. Stripe dashboard → toggle **Test mode** (top right).
2. Products → **+ Add product**:
   - **Pro** — recurring, two prices:
     - $12.00 USD / month  → record price id as `STRIPE_PRICE_PRO_MONTHLY`
     - $99.00 USD / year   → record price id as `STRIPE_PRICE_PRO_ANNUAL`
   - **Coach** — recurring, **per-seat**:
     - $20.00 USD / month, **Usage type: Licensed (per-unit)**, quantity will be
       set per-checkout by us. Record as `STRIPE_PRICE_COACH`.

### Option B — CLI (recommended; one shot)

```bash
stripe products create --name=Pro
PRO_PRODUCT=prod_xxx  # from the previous output

stripe prices create \
  --product=$PRO_PRODUCT --currency=usd --unit-amount=1200 \
  -d "recurring[interval]=month"

stripe prices create \
  --product=$PRO_PRODUCT --currency=usd --unit-amount=9900 \
  -d "recurring[interval]=year"

stripe products create --name="Coach (per active client)"
COACH_PRODUCT=prod_yyy

stripe prices create \
  --product=$COACH_PRODUCT --currency=usd --unit-amount=2000 \
  -d "recurring[interval]=month" \
  -d "recurring[usage_type]=licensed"
```

Record all three `price_...` ids — they go into `.env.local`.

## 2. Local environment

Copy `.env.example` to `.env.local` if you haven't already, then fill in:

```ini
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...           # from `stripe listen` in step 3
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_COACH=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create the new tables (`subscriptions`, `usage_events`):

```bash
npm run db:init
```

Boot the app:

```bash
npm run dev
```

## 3. Forward webhooks locally

In a second terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` line it prints into `STRIPE_WEBHOOK_SECRET` in `.env.local`
and **restart `npm run dev`** so the new env is read.

Sanity-check: `stripe trigger checkout.session.completed` should print
`200 OK` from the forwarder. If you see 400 "signature verification failed",
the secret is wrong or the dev server is stale.

---

## E2E verification — five checks

For each check, paste into the PR (a) what you ran, (b) the relevant `stripe
listen` event line, (c) the SQL row state, (d) a screenshot of the UI.

### Check 1 — Free cap blocks the 4th form check in the same week

**Setup.** Sign in as a fresh athlete. Confirm in DB:
```sql
SELECT plan, status FROM subscriptions
 WHERE account_type='athlete' AND account_id='<athleteId>';
-- expected: no row, OR plan='free' status='inactive'
```

**Action.** Run three form checks back-to-back so `form_checks` has 3 rows for
this athlete this ISO week. On the fourth attempt:

- Client preflight: the UploadModal pulls `/api/usage` and blocks with
  *"You've used all 3 form checks this week."* — screenshot the toast.
- Bypass the modal by POSTing directly:
  ```bash
  curl -i -X POST -H 'cookie: <session>' \
    -F lift=bench -F cv_json='{}' http://localhost:3000/api/formcheck
  ```
  Expected: **HTTP 402** with `QuotaError` body
  `form_check quota reached (3/3 per week on free plan)`.

### Check 2 — Pro checkout flips the athlete to `pro`

**Action.** Click *Go Pro · $12/mo* in `BillingPanel` on `/profile`. In hosted
Checkout use card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.

**Watch the `stripe listen` window.** You should see, in order:
```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
invoice.paid
```
All forwarded with `200 OK`.

**DB:**
```sql
SELECT plan, status, quantity, stripe_subscription_id
  FROM subscriptions WHERE account_type='athlete' AND account_id='<athleteId>';
-- expected: plan='pro', status='active', quantity=1
```

**UI:** `/api/usage` returns `plan: 'pro'`, `formChecks.limit: 100`,
`formChecks.window: 'month'`. The profile meter shows `0/100 this month` and the
"Manage billing" button replaces the upgrade button.

### Check 3 — Coach checkout sets quantity = active client count

**Setup.** Sign in as a coach with **3 active** roster rows
(`coach_athletes.status = 'active'`).

**Action.** Click *Upgrade roster* on the coach console. Confirm the Stripe
Checkout summary shows **Coach · qty 3 · $60.00/mo**. Pay with `4242…`.

**Webhook log:** `customer.subscription.created` with `items[0].quantity: 3`.

**DB:** `subscriptions.quantity = 3`, `plan='coach'`, `status='active'`.

### Check 4 — Adding a client bumps the Stripe quantity

**Action.** Same coach as Check 3. POST `/api/coach/roster` to add a new active
athlete. `syncCoachSeats` runs after the insert.

**Stripe:**
```bash
stripe subscriptions retrieve <sub_id> --expand items.data.price
# expect items.data[0].quantity == 4
```

`stripe listen` shows `customer.subscription.updated`. After that webhook
fires, our DB row reflects `quantity=4`. (If `syncCoachSeats` swallowed an
error — by design — the next `subscription.updated` from Stripe's own
prorations heals it; check Stripe directly first.)

### Check 5 — Coached athlete inherits the `coach` tier

**Setup.** With the coach above still on `coach` / `active`, take any athlete
in their roster and confirm in DB that `athletes.coached_by = '<coachId>'`.

**Verify:** Sign in as that athlete. `GET /api/usage` returns:
```json
{ "athlete": { "plan": "coach",
               "formChecks": { "limit": 200, "window": "month" },
               "ai":         { "limit": null, "window": "month", "remaining": null } } }
```
This proves `resolveAthletePlan` overrides the athlete's own Free/Pro with the
coach's active 'coach' plan. The `BillingPanel` on `/profile` should show
*"Your coach's plan covers your form checks and AI coaching."*

### Check 6 — Billing Portal opens for both account types

**Action.** Click *Manage billing* on the athlete profile, then again on the
coach console. Both should redirect to a `billing.stripe.com/p/...` URL with
the customer's name pre-loaded. Confirm the Stripe Portal lets the athlete
swap monthly↔annual and lets the coach cancel.

---

## Deviations to flag in the PR

Anything that does not match the above, especially:
- Webhook event arrives but the DB row stays on `plan='free'` — usually
  metadata didn't make it onto the subscription; check Checkout `subscription_data.metadata`.
- `current_period_end` is `null` after a successful payment — newer Stripe API
  versions moved the field onto items; the webhook reads both forms but worth
  noting if either pattern stops working.
- Coach quantity drifts and never self-heals on the next webhook — Stripe
  retry, or our metadata mapping is wrong.

## Closing the loop

When all six checks pass, attach:
1. The three `price_...` ids you created (Pro monthly, Pro annual, Coach).
2. The webhook endpoint id (or "stripe listen, local") used for the run.
3. The six pieces of evidence above (one per check).
