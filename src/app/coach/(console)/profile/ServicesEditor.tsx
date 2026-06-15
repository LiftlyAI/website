'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import type { CoachService, ServiceCadence } from '@/lib/types';

interface Row {
  name: string;
  description: string;
  price: string;
  cadence: ServiceCadence;
  features: string;
}

function toRow(s: CoachService): Row {
  return {
    name: s.name,
    description: s.description ?? '',
    price: s.price != null ? String(s.price) : '',
    cadence: s.cadence,
    features: s.features.join('\n'),
  };
}

export function ServicesEditor({ initial }: { initial: CoachService[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setSaved(false);
  }
  function add() {
    setRows((p) => [...p, { name: '', description: '', price: '', cadence: 'month', features: '' }]);
    setSaved(false);
  }
  function remove(i: number) {
    setRows((p) => p.filter((_, idx) => idx !== i));
    setSaved(false);
  }

  async function save() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const services = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        description: r.description.trim() || undefined,
        price: r.price.trim() ? Number(r.price) : null,
        cadence: r.cadence,
        features: r.features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
      }));
    try {
      const res = await fetch('/api/coach/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ services }),
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
      <CardHeader title="Services" subtitle="shown on your profile · display only" accent />
      <div className="space-y-4">
        {rows.length === 0 && (
          <p className="font-body text-sm text-chalk-mute">No services listed yet.</p>
        )}
        {rows.map((r, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-iron-700 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-xs text-chalk-mute">Service {i + 1}</span>
              <button
                onClick={() => remove(i)}
                aria-label="Remove service"
                className="text-chalk-mute transition-colors hover:text-rpe-max"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Name" value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Online Coaching" />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Price ($)" type="number" value={r.price} onChange={(e) => update(i, { price: e.target.value })} />
                <Select
                  label="Cadence"
                  value={r.cadence}
                  onChange={(e) => update(i, { cadence: e.target.value as ServiceCadence })}
                  options={[
                    { value: 'month', label: 'per month' },
                    { value: 'one-time', label: 'one-time' },
                    { value: 'session', label: 'per session' },
                  ]}
                />
              </div>
            </div>
            <Textarea label="Description" rows={2} value={r.description} onChange={(e) => update(i, { description: e.target.value })} />
            <Textarea
              label="Features (one per line)"
              rows={3}
              value={r.features}
              onChange={(e) => update(i, { features: e.target.value })}
              placeholder={'Weekly programming\nVideo review\nMeet prep'}
            />
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add service
        </Button>
        {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
        {saved && <div className="font-mono text-sm text-rpe-easy">Saved.</div>}
        <div>
          <Button onClick={save} loading={loading}>
            Save services
          </Button>
        </div>
      </div>
    </Card>
  );
}
