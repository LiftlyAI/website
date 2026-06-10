'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { RosterEntry } from '@/lib/types';

const EXAMPLE = JSON.stringify(
  {
    days: [
      {
        dayNumber: 1,
        dayName: 'Squat day',
        exercises: [
          { name: 'Competition Squat', sets: 4, reps: 5, targetRPE: 7.5, percentageOfMax: 78 },
          { name: 'Romanian Deadlift', sets: 3, reps: 8, targetRPE: 7 },
        ],
      },
      {
        dayNumber: 2,
        dayName: 'Bench day',
        exercises: [
          { name: 'Competition Bench', sets: 5, reps: 3, targetRPE: 8 },
          { name: 'Close Grip Bench', sets: 3, reps: 8, targetRPE: 7 },
        ],
      },
    ],
  },
  null,
  2,
);

interface BulkResult {
  athleteId: string;
  ok: boolean;
  weekNumber?: number;
  reason?: string;
}

export function BulkClient({ roster }: { roster: RosterEntry[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [blockName, setBlockName] = useState('');
  const [json, setJson] = useState(EXAMPLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkResult[] | null>(null);

  function toggle(id: string) {
    setSelected((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function push() {
    setError(null);
    setResults(null);
    if (selected.size === 0) {
      setError('Pick at least one client.');
      return;
    }
    if (!blockName.trim()) {
      setError('Name the block.');
      return;
    }
    let parsed: { days?: unknown };
    try {
      parsed = JSON.parse(json);
    } catch {
      setError('Template is not valid JSON.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/coach/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          athleteIds: [...selected],
          blockName: blockName.trim(),
          theme: '',
          days: parsed.days,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'failed');
      setResults(data.results as BulkResult[]);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  const byId = new Map(roster.map((r) => [r.athleteId, r]));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader title="Clients" subtitle={`${selected.size} selected`} accent />
        {roster.length === 0 ? (
          <p className="text-sm text-chalk-mute font-body">No clients on the roster yet.</p>
        ) : (
          <ul className="space-y-2">
            {roster.map((r) => (
              <li key={r.athleteId}>
                <label className="flex items-center gap-3 cursor-pointer text-sm font-body text-chalk-dim hover:text-chalk">
                  <input
                    type="checkbox"
                    checked={selected.has(r.athleteId)}
                    onChange={() => toggle(r.athleteId)}
                    className="accent-blue-500"
                  />
                  <span>{r.name ?? r.email}</span>
                  {!r.hasProfile && (
                    <span className="text-[10px] font-mono text-chalk-mute">
                      not onboarded
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Template week" accent />
        <div className="space-y-3">
          <Input
            label="Block name"
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            placeholder="e.g. Strength block W1"
          />
          <label className="block">
            <span className="block font-body font-medium text-xs uppercase tracking-wide text-chalk-dim mb-1.5">
              Days (JSON)
            </span>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={14}
              spellCheck={false}
              className="input-iron w-full font-mono text-xs"
            />
          </label>
          {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
          <Button onClick={push} loading={loading} className="w-full">
            Push to {selected.size || '…'} client{selected.size === 1 ? '' : 's'}
          </Button>
          {results && (
            <ul className="space-y-1 pt-2 border-t border-iron-800">
              {results.map((r) => (
                <li key={r.athleteId} className="text-xs font-mono">
                  <span className={r.ok ? 'text-rpe-easy' : 'text-rpe-max'}>
                    {r.ok ? `week ${r.weekNumber} added` : r.reason}
                  </span>{' '}
                  <span className="text-chalk-mute">
                    — {byId.get(r.athleteId)?.name ?? byId.get(r.athleteId)?.email ?? r.athleteId}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
