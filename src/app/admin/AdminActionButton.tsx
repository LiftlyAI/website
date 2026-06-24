'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

// One reusable PATCH-to-/api/admin button. `body` is the discriminated payload
// the admin route expects (entity + action/value/id).
export function AdminActionButton({
  body,
  label,
  variant = 'primary',
}: {
  body: Record<string, unknown>;
  label: string;
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    // Destructive moderation (ban / reject / hide) gets a confirm gate.
    if (variant === 'danger' && !confirm(`${label}? This affects what users see.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Could not ${label.toLowerCase()}.`);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Could not ${label.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button size="sm" variant={variant} onClick={run} loading={loading}>
        {label}
      </Button>
      {error && <span className="font-mono text-[11px] text-rpe-max">{error}</span>}
    </span>
  );
}
