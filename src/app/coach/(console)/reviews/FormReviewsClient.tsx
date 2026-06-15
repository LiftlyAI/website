'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import type { SharedFormCheck } from '@/lib/form-review-data';

function analysisSummary(json: string | null): string | null {
  if (!json) return null;
  try {
    const a = JSON.parse(json);
    return a.overall ?? a.summary ?? null;
  } catch {
    return null;
  }
}

function ReviewItem({ item }: { item: SharedFormCheck }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(item.feedback ?? '');
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const summary = analysisSummary(item.aiAnalysis);

  async function draft() {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/form-feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formCheckId: item.formCheckId, draft: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setFeedback(data.draft);
      setSaved(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    if (!feedback.trim()) {
      setError('Write feedback first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/form-feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formCheckId: item.formCheckId, feedback }),
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="font-body text-sm font-semibold text-chalk">
            {item.athleteName ?? 'Athlete'}
          </span>
          <span className="ml-2 font-mono text-xs uppercase text-chalk-mute">{item.lift}</span>
        </div>
        <span className="font-mono text-xs text-chalk-mute">
          {item.estimatedRpe != null ? `RPE ~${item.estimatedRpe.toFixed(1)}` : ''}
          {item.loadKg != null ? ` · ${item.loadKg}kg` : ''}
        </span>
      </div>

      {item.userContext && (
        <p className="mb-2 font-body text-sm text-chalk-dim">“{item.userContext}”</p>
      )}
      {summary && (
        <p className="mb-3 rounded-lg border border-iron-700 bg-iron-900/50 p-3 font-body text-xs text-chalk-mute">
          AI read: {summary}
        </p>
      )}

      <Textarea
        label="Your feedback to the athlete"
        rows={4}
        value={feedback}
        onChange={(e) => {
          setFeedback(e.target.value);
          setSaved(false);
        }}
      />
      {error && <div className="mt-2 font-mono text-sm text-rpe-max">{error}</div>}
      {saved && <div className="mt-2 font-mono text-sm text-rpe-easy">Sent to athlete.</div>}
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" size="sm" onClick={draft} loading={drafting}>
          <Sparkles className="h-4 w-4" /> AI draft
        </Button>
        <Button size="sm" onClick={save} loading={loading}>
          {item.feedback ? 'Update feedback' : 'Send feedback'}
        </Button>
      </div>
    </Card>
  );
}

export function FormReviewsClient({ items }: { items: SharedFormCheck[] }) {
  if (items.length === 0) {
    return (
      <div className="chalk-card p-8 text-center font-body text-sm text-chalk-mute">
        No clips shared yet. When a coached athlete shares a form check, it shows up here for your
        feedback.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {items.map((it) => (
        <ReviewItem key={it.formCheckId} item={it} />
      ))}
    </div>
  );
}
