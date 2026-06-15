'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import type { CoachPost } from '@/lib/types';

export function PostsManager({ initial }: { initial: CoachPost[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), imageUrl: imageUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setTitle('');
      setBody('');
      setImageUrl('');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    await fetch('/api/coach/posts', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="New post" subtitle="reaches your followers" accent />
        <div className="space-y-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Why your bench stalls at lockout" />
          <Textarea label="Body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <Input label="Image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
          <Button onClick={publish} loading={loading}>
            Publish
          </Button>
        </div>
      </Card>

      {initial.length > 0 && (
        <div className="space-y-3">
          <h2 className="stencil-heading text-lg text-chalk">Published</h2>
          {initial.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-body text-sm font-semibold text-chalk">{p.title}</div>
                  <p className="mt-1 line-clamp-2 font-body text-sm text-chalk-dim">{p.body}</p>
                </div>
                <button onClick={() => del(p.id)} aria-label="Delete post" className="text-chalk-mute hover:text-rpe-max">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
