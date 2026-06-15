'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';

// Serious athlete-intake form. Submits to /api/coaches/apply; on success the
// coach sees it in their applications inbox and can accept into their roster.
export function ApplyForCoachingModal({
  username,
  coachName,
  onClose,
}: {
  username: string;
  coachName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({
    age: '',
    sex: '',
    experience: '',
    bodyweight: '',
    unit: 'lbs',
    bestSquat: '',
    bestBench: '',
    bestDeadlift: '',
    meetHistory: '',
    goals: '',
    timeline: '',
    injuries: '',
    availability: '',
  });

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

  async function submit() {
    if (!f.goals.trim()) {
      setError('Tell the coach what you want to achieve.');
      return;
    }
    setLoading(true);
    setError(null);
    const payload = {
      age: num(f.age),
      sex: f.sex || undefined,
      experience: f.experience || undefined,
      bodyweight: num(f.bodyweight),
      unit: f.unit,
      bestSquat: num(f.bestSquat),
      bestBench: num(f.bestBench),
      bestDeadlift: num(f.bestDeadlift),
      meetHistory: f.meetHistory || undefined,
      goals: f.goals || undefined,
      timeline: f.timeline || undefined,
      injuries: f.injuries || undefined,
      availability: f.availability || undefined,
    };
    try {
      const res = await fetch('/api/coaches/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setDone(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="chalk-card my-8 w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="page-kicker mb-1">// APPLY FOR COACHING</div>
            <h2 className="stencil-heading text-xl text-chalk">Apply to {coachName}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-chalk-mute transition-colors hover:bg-iron-800 hover:text-chalk"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 py-4 text-center">
            <p className="font-body text-sm text-chalk">
              Application sent to {coachName}. You&apos;ll see the status in your coaching tab.
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Age" type="number" value={f.age} onChange={(e) => set('age', e.target.value)} />
              <Select
                label="Sex"
                value={f.sex}
                onChange={(e) => set('sex', e.target.value)}
                options={[
                  { value: '', label: '—' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]}
              />
              <Select
                label="Experience"
                value={f.experience}
                onChange={(e) => set('experience', e.target.value)}
                options={[
                  { value: '', label: '—' },
                  { value: 'novice', label: 'Novice' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Bodyweight" type="number" value={f.bodyweight} onChange={(e) => set('bodyweight', e.target.value)} />
                <Select
                  label="Unit"
                  value={f.unit}
                  onChange={(e) => set('unit', e.target.value)}
                  options={[
                    { value: 'lbs', label: 'lbs' },
                    { value: 'kg', label: 'kg' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input label="Best Squat" type="number" value={f.bestSquat} onChange={(e) => set('bestSquat', e.target.value)} />
              <Input label="Best Bench" type="number" value={f.bestBench} onChange={(e) => set('bestBench', e.target.value)} />
              <Input label="Best Deadlift" type="number" value={f.bestDeadlift} onChange={(e) => set('bestDeadlift', e.target.value)} />
            </div>

            <Textarea label="Goals" value={f.goals} onChange={(e) => set('goals', e.target.value)} placeholder="What do you want to achieve?" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Timeline" value={f.timeline} onChange={(e) => set('timeline', e.target.value)} placeholder="e.g. meet in 16 weeks" />
              <Input label="Availability" value={f.availability} onChange={(e) => set('availability', e.target.value)} placeholder="e.g. 4 days/week" />
            </div>
            <Textarea label="Meet history" value={f.meetHistory} onChange={(e) => set('meetHistory', e.target.value)} placeholder="Federations, totals, dates (optional)" />
            <Textarea label="Injuries / limitations" value={f.injuries} onChange={(e) => set('injuries', e.target.value)} placeholder="Anything the coach should know (optional)" />

            {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submit} loading={loading}>
                Send application
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
