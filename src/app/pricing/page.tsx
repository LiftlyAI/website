'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

async function startCheckout(plan: string, setErr: (s: string | null) => void): Promise<void> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  if (res.status === 401) {
    window.location.href = plan === 'coach' ? '/coach/login' : '/login';
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (data.url) window.location.href = data.url;
  else setErr(data.error ?? 'Could not start checkout');
}

interface Tier {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: string;
  action: () => void;
  highlight?: boolean;
}

export default function PricingPage() {
  const [busy, setBusy] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go(plan: string) {
    setBusy(true);
    setErr(null);
    await startCheckout(plan, setErr);
    setBusy(false);
  }

  const tiers: Tier[] = [
    {
      name: 'Free',
      price: '$0',
      cadence: 'forever',
      blurb: 'The whole coach. Metered, not locked.',
      features: [
        'Adaptive RPE program + auto-progression',
        '3 form checks / week',
        'AI chat, nutrition & readiness (metered)',
        'Velocity-based RPE & bar-path tracking',
      ],
      cta: 'Start free',
      action: () => {
        window.location.href = '/login';
      },
    },
    {
      name: 'Pro',
      price: annual ? '$99' : '$12',
      cadence: annual ? '/year' : '/month',
      blurb: 'For lifters training hard enough to outgrow the free meter.',
      features: [
        '100 form checks / month',
        'Generous AI coaching limits',
        'Everything in Free',
        'Priority analysis',
      ],
      cta: annual ? 'Go Pro · $99/yr' : 'Go Pro · $12/mo',
      action: () => go(annual ? 'pro_annual' : 'pro_monthly'),
      highlight: true,
    },
    {
      name: 'Coach',
      price: '$20',
      cadence: '/client/mo',
      blurb: 'Run your whole roster. Billed for active clients only.',
      features: [
        '200 form checks / client / month',
        'Unlimited AI for you and every client',
        'Roster triage, bulk programming, approvals',
        'Per-seat billing — pay for active clients',
      ],
      cta: 'Set up coaching',
      action: () => go('coach'),
    },
  ];

  return (
    <main className="min-h-screen bg-ink text-chalk px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <div className="page-kicker mb-2">// PRICING</div>
            <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">
              CHEAPER THAN A COACH
            </h1>
            <div className="accent-divider mt-3 max-w-[120px]" />
            <p className="text-sm text-chalk-mute mt-3 max-w-xl font-body">
              Human coaches run $100–300 a month. Get the adaptive programming and the
              form feedback for a fraction — and start for free.
            </p>
          </div>
          <Link href="/" className="btn-ghost text-xs px-3 py-2">
            ← Home
          </Link>
        </div>

        <div className="inline-flex items-center gap-1 border border-iron-700 p-1 mb-8 font-mono text-xs">
          <button
            onClick={() => setAnnual(false)}
            className={`px-3 py-1.5 ${!annual ? 'bg-blood text-ink' : 'text-chalk-mute'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-3 py-1.5 ${annual ? 'bg-blood text-ink' : 'text-chalk-mute'}`}
          >
            Annual · save 31%
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`chalk-card p-6 flex flex-col ${
                t.highlight ? 'border-blood' : 'border-iron-800'
              }`}
            >
              <div className="stencil-heading text-xs tracking-widest text-chalk-mute mb-2">
                {t.name.toUpperCase()}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="stencil-heading text-4xl text-chalk">{t.price}</span>
                <span className="text-sm text-chalk-mute font-mono">{t.cadence}</span>
              </div>
              <p className="text-xs text-chalk-mute font-body mb-5 min-h-[2.5rem]">{t.blurb}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {t.features.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-chalk-dim">
                    <Check className="w-4 h-4 text-blood shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={t.highlight ? 'primary' : 'ghost'}
                onClick={t.action}
                disabled={busy}
                className="w-full"
              >
                {t.cta}
              </Button>
            </div>
          ))}
        </div>

        {err && <p className="text-sm text-rpe-max font-mono mt-6">{err}</p>}

        <p className="text-xs text-chalk-mute font-body mt-10 max-w-2xl">
          Form-check coaching is generated by AI from your video and is for training guidance only —
          it is not medical advice. Lift within your limits.
        </p>
      </div>
    </main>
  );
}
