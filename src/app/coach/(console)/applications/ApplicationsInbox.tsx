'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { CoachApplication } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-rpe-mod/15 text-rpe-mod',
  accepted: 'bg-rpe-easy/15 text-rpe-easy',
  rejected: 'bg-iron-800 text-chalk-mute',
  waitlisted: 'bg-blood/15 text-blood-glow',
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-chalk-mute">{label}</div>
      <div className="font-body text-sm text-chalk-dim">{value}</div>
    </div>
  );
}

function ApplicationCard({ app }: { app: CoachApplication }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const p = app.payload;
  const lifts = [p.bestSquat, p.bestBench, p.bestDeadlift];
  const total = lifts.every((x) => typeof x === 'number') ? lifts.reduce((a, b) => a! + b!, 0) : undefined;

  async function act(action: 'accepted' | 'rejected' | 'waitlisted') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch('/api/coach/applications', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: app.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-body text-sm font-semibold text-chalk">
            {app.athleteName ?? app.athleteEmail}
          </div>
          <div className="font-mono text-xs text-chalk-mute">{app.athleteEmail}</div>
        </div>
        <span className={cn('rounded px-2 py-0.5 font-mono text-[10px] uppercase', STATUS_STYLE[app.status])}>
          {app.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Age" value={p.age} />
        <Field label="Sex" value={p.sex} />
        <Field label="Experience" value={p.experience} />
        <Field label="Bodyweight" value={p.bodyweight ? `${p.bodyweight} ${p.unit ?? ''}` : undefined} />
        <Field label="Squat" value={p.bestSquat} />
        <Field label="Bench" value={p.bestBench} />
        <Field label="Deadlift" value={p.bestDeadlift} />
        <Field label="Total" value={total} />
      </div>

      <div className="mt-3 space-y-2">
        <Field label="Goals" value={p.goals} />
        <Field label="Timeline" value={p.timeline} />
        <Field label="Availability" value={p.availability} />
        <Field label="Meet history" value={p.meetHistory} />
        <Field label="Injuries" value={p.injuries} />
      </div>

      {error && <div className="mt-3 font-mono text-sm text-rpe-max">{error}</div>}

      {app.status === 'pending' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => act('accepted')} loading={busy === 'accepted'}>
            Accept
          </Button>
          <Button size="sm" variant="ghost" onClick={() => act('waitlisted')} loading={busy === 'waitlisted'}>
            Waitlist
          </Button>
          <Button size="sm" variant="danger" onClick={() => act('rejected')} loading={busy === 'rejected'}>
            Reject
          </Button>
        </div>
      )}
      {app.status === 'accepted' && (
        <div className="mt-3 font-mono text-xs text-rpe-easy">
          On your roster — manage in Triage / Roster.
        </div>
      )}
    </Card>
  );
}

export function ApplicationsInbox({ applications }: { applications: CoachApplication[] }) {
  const pending = applications.filter((a) => a.status === 'pending');
  const resolved = applications.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="stencil-heading text-lg text-chalk">
          Pending{pending.length > 0 && ` (${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <div className="chalk-card p-6 text-center font-body text-sm text-chalk-mute">
            No pending applications.
          </div>
        ) : (
          pending.map((a) => <ApplicationCard key={a.id} app={a} />)
        )}
      </div>

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="stencil-heading text-lg text-chalk">History</h2>
          {resolved.map((a) => (
            <ApplicationCard key={a.id} app={a} />
          ))}
        </div>
      )}
    </div>
  );
}
