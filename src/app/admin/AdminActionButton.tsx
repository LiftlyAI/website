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

  async function run() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant={variant} onClick={run} loading={loading}>
      {label}
    </Button>
  );
}
