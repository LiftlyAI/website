'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, FileText } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Coach-controlled AI tools. The coach decides when to run them; nothing fires
// automatically. Draft program writes a new program; analyze is read-only.
export function ClientTools({ athleteId, hasProfile }: { athleteId: string; hasProfile: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(tool: 'draft-program' | 'analyze') {
    setBusy(tool);
    setError(null);
    setMsg(null);
    if (tool === 'analyze') setAnalysis(null);
    try {
      const res = await fetch('/api/coach/tools', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ athleteId, tool }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      if (tool === 'analyze') {
        setAnalysis(data.analysis);
      } else {
        setMsg(`Drafted a ${data.weeks}-week program — it's now this athlete's active plan.`);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader title="AI tools" subtitle="you stay in control" accent />
      {!hasProfile ? (
        <p className="font-body text-sm text-chalk-mute">
          Available once this athlete has onboarded.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => run('analyze')} loading={busy === 'analyze'}>
              <Sparkles className="h-4 w-4" /> Fatigue & volume analysis
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run('draft-program')} loading={busy === 'draft-program'}>
              <FileText className="h-4 w-4" /> Draft new program
            </Button>
          </div>
          {error && <div className="font-mono text-sm text-rpe-max">{error}</div>}
          {msg && <div className="font-mono text-sm text-rpe-easy">{msg}</div>}
          {analysis && (
            <div className="whitespace-pre-line rounded-lg border border-iron-700 bg-iron-900/50 p-4 font-body text-sm text-chalk-dim">
              {analysis}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
