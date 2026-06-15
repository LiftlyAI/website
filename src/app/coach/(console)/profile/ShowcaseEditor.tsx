'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import type { CoachShowcase, ShowcaseAthleteData, ShowcaseResultData } from '@/lib/types';

type Item =
  | { type: 'result'; data: ShowcaseResultData }
  | { type: 'athlete'; data: ShowcaseAthleteData };

const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

export function ShowcaseEditor({ initial }: { initial: CoachShowcase[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(
    initial.map((i) => ({ type: i.type, data: i.data }) as Item),
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(i: number, data: Record<string, unknown>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? ({ ...it, data: { ...it.data, ...data } } as Item) : it)));
    setSaved(false);
  }
  function setType(i: number, type: 'result' | 'athlete') {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i ? (type === 'result' ? { type, data: { title: '' } } : { type, data: { name: '' } }) : it,
      ),
    );
    setSaved(false);
  }
  function add(type: 'result' | 'athlete') {
    setItems((p) => [...p, type === 'result' ? { type, data: { title: '' } } : { type, data: { name: '' } }]);
    setSaved(false);
  }
  function remove(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i));
    setSaved(false);
  }

  async function save() {
    setLoading(true);
    setError(null);
    setSaved(false);
    // Drop empty entries.
    const clean = items.filter((it) =>
      it.type === 'result' ? (it.data as ShowcaseResultData).title.trim() : (it.data as ShowcaseAthleteData).name.trim(),
    );
    try {
      const res = await fetch('/api/coach/showcase', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setSaved(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Showcase" subtitle="results & coached athletes" accent />
      <div className="space-y-4">
        {items.length === 0 && (
          <p className="font-body text-sm text-chalk-mute">Nothing showcased yet.</p>
        )}
        {items.map((it, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-iron-700 p-4">
            <div className="flex items-center justify-between gap-3">
              <Select
                value={it.type}
                onChange={(e) => setType(i, e.target.value as 'result' | 'athlete')}
                options={[
                  { value: 'result', label: 'Result / transformation' },
                  { value: 'athlete', label: 'Coached athlete' },
                ]}
                className="w-auto py-2 text-xs"
              />
              <button onClick={() => remove(i)} aria-label="Remove" className="text-chalk-mute hover:text-rpe-max">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {it.type === 'result' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Title" value={it.data.title} onChange={(e) => patch(i, { title: e.target.value })} placeholder="495 squat in 11 months" />
                <Input label="Athlete name" value={it.data.athleteName ?? ''} onChange={(e) => patch(i, { athleteName: e.target.value })} />
                <Input label="Lift" value={it.data.lift ?? ''} onChange={(e) => patch(i, { lift: e.target.value })} placeholder="Squat" />
                <Input label="Timeframe" value={it.data.timeframe ?? ''} onChange={(e) => patch(i, { timeframe: e.target.value })} placeholder="11 months" />
                <Input label="Before" type="number" value={it.data.beforeValue != null ? String(it.data.beforeValue) : ''} onChange={(e) => patch(i, { beforeValue: num(e.target.value) })} />
                <Input label="After" type="number" value={it.data.afterValue != null ? String(it.data.afterValue) : ''} onChange={(e) => patch(i, { afterValue: num(e.target.value) })} />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Name" value={it.data.name} onChange={(e) => patch(i, { name: e.target.value })} />
                <Input label="Weight class" value={it.data.weightClass ?? ''} onChange={(e) => patch(i, { weightClass: e.target.value })} placeholder="83kg" />
                <Input label="Best squat" type="number" value={it.data.bestSquat != null ? String(it.data.bestSquat) : ''} onChange={(e) => patch(i, { bestSquat: num(e.target.value) })} />
                <Input label="Best bench" type="number" value={it.data.bestBench != null ? String(it.data.bestBench) : ''} onChange={(e) => patch(i, { bestBench: num(e.target.value) })} />
                <Input label="Best deadlift" type="number" value={it.data.bestDeadlift != null ? String(it.data.bestDeadlift) : ''} onChange={(e) => patch(i, { bestDeadlift: num(e.target.value) })} />
                <Input label="Meet result" value={it.data.meetResult ?? ''} onChange={(e) => patch(i, { meetResult: e.target.value })} placeholder="1st · USAPL Nationals" />
              </div>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => add('result')}>
            <Plus className="h-4 w-4" /> Result
          </Button>
          <Button variant="ghost" size="sm" onClick={() => add('athlete')}>
            <Plus className="h-4 w-4" /> Athlete
          </Button>
        </div>
        {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
        {saved && <div className="font-mono text-sm text-rpe-easy">Saved.</div>}
        <div>
          <Button onClick={save} loading={loading}>
            Save showcase
          </Button>
        </div>
      </div>
    </Card>
  );
}
