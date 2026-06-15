'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { StarRating } from '@/components/ui/StarRating';

const SUBS: { key: 'communication' | 'programming' | 'meetPrep' | 'responsiveness'; label: string }[] = [
  { key: 'communication', label: 'Communication' },
  { key: 'programming', label: 'Programming quality' },
  { key: 'meetPrep', label: 'Meet prep' },
  { key: 'responsiveness', label: 'Responsiveness' },
];

export function ReviewForm({ username, existing }: { username: string; existing?: { rating: number } }) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [subs, setSubs] = useState<Record<string, number>>({});
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (rating < 1) {
      setError('Give an overall rating.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coaches/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, rating, ...subs, body: body || undefined }),
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

  if (done) {
    return (
      <div className="chalk-card p-5 font-body text-sm text-rpe-easy">
        Thanks — your review is live.
      </div>
    );
  }

  return (
    <div className="chalk-card space-y-4 p-5">
      <div className="font-body text-sm font-semibold text-chalk">
        {existing ? 'Update your review' : 'Leave a review'}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-body text-xs uppercase tracking-wide text-chalk-dim">Overall</span>
        <StarRating value={rating} onChange={setRating} size={22} />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUBS.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-2">
            <span className="font-body text-xs text-chalk-mute">{s.label}</span>
            <StarRating
              value={subs[s.key] ?? 0}
              onChange={(v) => setSubs((p) => ({ ...p, [s.key]: v }))}
              size={16}
            />
          </div>
        ))}
      </div>
      <Textarea
        label="Your experience"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="How was the programming, communication, and results?"
      />
      {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
      <Button onClick={submit} loading={loading}>
        {existing ? 'Update review' : 'Post review'}
      </Button>
    </div>
  );
}
