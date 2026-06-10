'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { CoachSuggestion } from '@/lib/types';

// The human-in-the-loop core: each pending row is the engine's proposal; the
// coach edits the weight if needed, then approves (applies to the program) or
// rejects. Resolved rows stay visible as the audit trail.
export function SuggestionQueue({
  athleteId,
  suggestions,
}: {
  athleteId: string;
  suggestions: CoachSuggestion[];
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = suggestions.filter((s) => s.status === 'pending');
  const resolved = suggestions.filter((s) => s.status !== 'pending').slice(0, 10);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/suggestions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ athleteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Approval queue"
        subtitle={pending.length > 0 ? `${pending.length} pending` : undefined}
        accent
      />
      <div className="space-y-4">
        {pending.length === 0 && (
          <p className="text-sm text-chalk-mute font-body">
            Nothing pending. Run the first pass to propose next-session loads off this
            client&apos;s recent logs — nothing applies until you approve it.
          </p>
        )}
        {pending.map((s) => (
          <PendingRow key={s.id} suggestion={s} onResolved={() => router.refresh()} />
        ))}

        {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
        <Button variant="ghost" onClick={generate} loading={generating}>
          {pending.length > 0 ? 'Regenerate first pass' : 'Run first pass'}
        </Button>

        {resolved.length > 0 && (
          <div className="pt-2 border-t border-iron-800">
            <div className="text-[10px] uppercase tracking-wide text-chalk-mute font-body mb-2">
              History
            </div>
            <ul className="space-y-1">
              {resolved.map((s) => (
                <li key={s.id} className="text-xs font-mono text-chalk-mute">
                  <span className={s.status === 'approved' ? 'text-rpe-easy' : 'text-rpe-max'}>
                    {s.status}
                  </span>{' '}
                  · {s.payload.exerciseName} → {s.editedWeight ?? s.payload.suggestedWeight}{' '}
                  {s.payload.unit}
                  {s.editedWeight != null && ' (edited)'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function PendingRow({
  suggestion,
  onResolved,
}: {
  suggestion: CoachSuggestion;
  onResolved: () => void;
}) {
  const p = suggestion.payload;
  const [weight, setWeight] = useState(String(p.suggestedWeight));
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'approve' | 'reject') {
    setBusy(action);
    setError(null);
    try {
      const w = parseFloat(weight);
      const res = await fetch('/api/coach/suggestions', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: suggestion.id,
          action,
          ...(action === 'approve' && Number.isFinite(w) && w > 0 ? { weight: w } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      onResolved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-iron-700 bg-iron-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-body font-semibold text-chalk">
            {p.exerciseName}
            {p.deload && <span className="ml-2 text-rpe-hard text-xs">deload</span>}
          </div>
          <div className="text-xs font-mono text-chalk-mute">
            {p.dayName} · Week {p.weekNumber} · planned {p.plannedWeight} {p.unit}
          </div>
          <p className="text-xs text-chalk-dim font-body mt-1 max-w-md">{p.reason}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="input-iron w-24 text-right font-mono"
            aria-label={`approved weight for ${p.exerciseName}`}
          />
          <span className="text-xs font-mono text-chalk-mute">{p.unit}</span>
          <Button size="sm" onClick={() => act('approve')} loading={busy === 'approve'}>
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => act('reject')}
            loading={busy === 'reject'}
          >
            Reject
          </Button>
        </div>
      </div>
      {error && <div className="text-xs text-rpe-max font-mono mt-2">{error}</div>}
    </div>
  );
}
