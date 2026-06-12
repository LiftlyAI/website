'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

// One client per line: "email" or "email, name". Accepts a TrainHeroic-style
// CSV export pasted straight in — extra columns beyond email/name are ignored.
function parseClients(text: string): { email: string; name?: string }[] {
  const out: { email: string; name?: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(',').map((p) => p.trim());
    const email = parts.find((p) => p.includes('@'));
    if (!email) continue;
    const name = parts.find((p) => p && !p.includes('@'));
    out.push(name ? { email, name } : { email });
  }
  return out;
}

export function AddClients() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);

  async function submit() {
    const clients = parseClients(text);
    if (clients.length === 0) {
      setError('No emails found. One client per line: "email, name".');
      return;
    }
    setLoading(true);
    setError(null);
    setAdded(null);
    try {
      const res = await fetch('/api/coach/roster', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setAdded(data.added);
      setText('');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Add clients"
        subtitle="paste a list or a CSV export"
        accent
      />
      <div className="space-y-3">
        <Textarea
          label="One per line: email, name"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'sarah@example.com, Sarah K\nmike@example.com'}
        />
        {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
        {added != null && (
          <div className="text-sm text-rpe-easy font-mono">
            Added {added} client{added === 1 ? '' : 's'}.
          </div>
        )}
        <Button onClick={submit} loading={loading}>
          Add to roster
        </Button>
      </div>
    </Card>
  );
}
