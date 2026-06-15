'use client';
import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

// Report a coach or a review. `target` decides the payload shape.
export function ReportButton({
  target,
  className,
}: {
  target: { type: 'coach'; username: string } | { type: 'review'; reviewId: string };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 3) {
      setError('Add a brief reason.');
      return;
    }
    setLoading(true);
    setError(null);
    const body =
      target.type === 'coach'
        ? { targetType: 'coach', username: target.username, reason }
        : { targetType: 'review', reviewId: target.reviewId, reason };
    try {
      const res = await fetch('/api/coaches/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex items-center gap-1 font-mono text-xs text-chalk-mute transition-colors hover:text-rpe-max'
        }
      >
        <Flag className="h-3 w-3" /> Report
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="chalk-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="stencil-heading text-lg text-chalk">Report</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-chalk-mute hover:text-chalk">
                <X className="h-5 w-5" />
              </button>
            </div>
            {done ? (
              <div className="space-y-3 text-center">
                <p className="font-body text-sm text-chalk">Thanks — our team will review this.</p>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  label="What's wrong?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Misleading claims, fake reviews, etc."
                />
                {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
                <Button onClick={submit} loading={loading}>
                  Submit report
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
