'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ShieldCheck, Clock, X } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CoachCredential } from '@/lib/types';

const STATUS = {
  approved: { label: 'Verified', cls: 'text-rpe-easy', Icon: ShieldCheck },
  pending: { label: 'Pending review', cls: 'text-rpe-mod', Icon: Clock },
  rejected: { label: 'Rejected', cls: 'text-rpe-max', Icon: X },
} as const;

export function CredentialsManager({ initial }: { initial: CoachCredential[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!title.trim()) {
      setError('Add a credential title.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/credentials', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), issuer: issuer.trim() || undefined, documentUrl: documentUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setTitle('');
      setIssuer('');
      setDocumentUrl('');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    await fetch('/api/coach/credentials', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Credentials" subtitle="an admin verifies each one" accent />
      <div className="space-y-4">
        {initial.length > 0 && (
          <div className="divide-y divide-iron-800">
            {initial.map((c) => {
              const s = STATUS[c.status];
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-body text-sm text-chalk">{c.title}</div>
                    <div className="font-mono text-xs text-chalk-mute">
                      {c.issuer ?? 'No issuer'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 font-mono text-xs ${s.cls}`}>
                      <s.Icon className="h-3.5 w-3.5" /> {s.label}
                    </span>
                    <button
                      onClick={() => del(c.id)}
                      aria-label="Delete credential"
                      className="text-chalk-mute transition-colors hover:text-rpe-max"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CSCS" />
          <Input label="Issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="NSCA" />
          <Input label="Document URL" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://…" />
        </div>
        {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
        <Button variant="ghost" size="sm" onClick={add} loading={loading}>
          Add credential
        </Button>
      </div>
    </Card>
  );
}
