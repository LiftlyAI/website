'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface MeterUsage {
  used: number;
  limit: number | null;
  window: 'week' | 'month';
  remaining: number | null;
}
interface AthleteUsage {
  plan: 'free' | 'pro' | 'coach';
  formChecks: MeterUsage;
  ai: MeterUsage;
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', coach: 'Coach (covered)' };

async function checkout(plan: string): Promise<{ url?: string; error?: string; status: number }> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json().catch(() => ({}));
  return { ...data, status: res.status };
}

async function openPortal(type: 'athlete' | 'coach'): Promise<{ url?: string; error?: string }> {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  return res.json().catch(() => ({}));
}

function Meter({ label, m }: { label: string; m: MeterUsage }) {
  const pct = m.limit == null ? 100 : Math.min(100, Math.round((m.used / m.limit) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs font-mono text-chalk-mute mb-1">
        <span>{label}</span>
        <span>{m.limit == null ? `${m.used} · unlimited` : `${m.used}/${m.limit} this ${m.window}`}</span>
      </div>
      <div className="h-1.5 bg-iron-800 overflow-hidden">
        <div className="h-full bg-blood" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AthleteBilling() {
  const [u, setU] = useState<AthleteUsage | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setU(d?.athlete ?? null))
      .catch(() => {});
  }, []);

  async function upgrade(plan: string) {
    setBusy(true);
    setErr(null);
    const r = await checkout(plan);
    if (r.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (r.url) {
      window.location.href = r.url;
      return;
    }
    setErr(r.error ?? 'Could not start checkout');
    setBusy(false);
  }

  async function manage() {
    setBusy(true);
    setErr(null);
    const r = await openPortal('athlete');
    if (r.url) {
      window.location.href = r.url;
      return;
    }
    setErr(r.error ?? 'No billing account yet');
    setBusy(false);
  }

  const plan = u?.plan ?? 'free';
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="stencil-heading text-xs tracking-widest text-chalk-mute mb-1">PLAN</div>
          <div className="stencil-heading text-2xl text-chalk">{PLAN_LABEL[plan]}</div>
        </div>
        <Link href="/pricing" className="btn-ghost text-xs px-3 py-2">
          See plans
        </Link>
      </div>

      {u && (
        <div className="space-y-3 mb-4">
          <Meter label="Form checks" m={u.formChecks} />
          <Meter label="AI coaching" m={u.ai} />
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {plan === 'free' ? (
          <>
            <Button size="sm" onClick={() => upgrade('pro_monthly')} disabled={busy}>
              Go Pro · $12/mo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => upgrade('pro_annual')} disabled={busy}>
              or $99/yr
            </Button>
          </>
        ) : plan === 'pro' ? (
          <Button size="sm" variant="ghost" onClick={manage} disabled={busy}>
            Manage billing
          </Button>
        ) : (
          <p className="text-xs text-chalk-mute font-body">
            Your coach&apos;s plan covers your form checks and AI coaching.
          </p>
        )}
      </div>
      {err && <p className="text-xs text-rpe-max font-mono mt-3">{err}</p>}
    </Card>
  );
}

export function CoachBilling() {
  const [plan, setPlan] = useState<'free' | 'coach' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlan((d?.coach?.plan as 'free' | 'coach') ?? 'free'))
      .catch(() => {});
  }, []);

  async function upgrade() {
    setBusy(true);
    setErr(null);
    const r = await checkout('coach');
    if (r.status === 401) {
      window.location.href = '/coach/login';
      return;
    }
    if (r.url) {
      window.location.href = r.url;
      return;
    }
    setErr(r.error ?? 'Could not start checkout');
    setBusy(false);
  }

  async function manage() {
    setBusy(true);
    setErr(null);
    const r = await openPortal('coach');
    if (r.url) {
      window.location.href = r.url;
      return;
    }
    setErr(r.error ?? 'No billing account yet');
    setBusy(false);
  }

  return (
    <Card className="border border-iron-700">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="stencil-heading text-xs tracking-widest text-chalk-mute mb-1">
            COACH PLAN
          </div>
          <div className="stencil-heading text-xl text-chalk">
            {plan === 'coach' ? 'Active' : 'Free'}
          </div>
          <p className="text-xs text-chalk-mute font-body mt-1 max-w-md">
            $20 / active client / month. Each client gets 200 form checks a month and unlimited AI
            coaching — billed for your active roster size.
          </p>
        </div>
        {plan === 'coach' ? (
          <Button size="sm" variant="ghost" onClick={manage} disabled={busy}>
            Manage billing
          </Button>
        ) : (
          <Button size="sm" onClick={upgrade} disabled={busy}>
            Upgrade roster
          </Button>
        )}
      </div>
      {err && <p className="text-xs text-rpe-max font-mono mt-3">{err}</p>}
    </Card>
  );
}
