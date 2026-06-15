'use client';
import { useState } from 'react';
import { Send, Check, MessageSquare } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export interface CoachPanelItem {
  id: string;
  lift: string;
  createdAt: number;
  shared: boolean;
  feedback: string | null;
}

function Row({ item, coachName }: { item: CoachPanelItem; coachName: string }) {
  const [shared, setShared] = useState(item.shared);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch('/api/formcheck/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formCheckId: item.id, shared: !shared }),
      });
      if (res.ok) setShared(!shared);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-body text-sm capitalize text-chalk">{item.lift}</span>
          <span className="ml-2 font-mono text-xs text-chalk-mute">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-body text-xs transition-all disabled:opacity-50',
            shared
              ? 'border-rpe-easy/40 bg-rpe-easy/10 text-rpe-easy'
              : 'border-iron-700 text-chalk-dim hover:border-blood/60 hover:text-chalk',
          )}
        >
          {shared ? (
            <>
              <Check className="h-3.5 w-3.5" /> Shared
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Send to coach
            </>
          )}
        </button>
      </div>
      {item.feedback && (
        <div className="mt-2 flex gap-2 rounded-lg border border-blood/25 bg-blood/5 p-3">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blood-glow" />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wide text-blood-glow">
              {coachName}
            </div>
            <p className="mt-0.5 whitespace-pre-line font-body text-sm text-chalk-dim">
              {item.feedback}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function FormCheckCoachPanel({
  coachName,
  items,
}: {
  coachName: string;
  items: CoachPanelItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 lg:pt-10">
      <Card>
        <CardHeader title="Send to your coach" subtitle={coachName} accent />
        <p className="mb-2 font-body text-sm text-chalk-mute">
          Share a clip with {coachName} for a human form review. Their feedback shows up right here.
        </p>
        <div className="divide-y divide-iron-800">
          {items.map((it) => (
            <Row key={it.id} item={it} coachName={coachName} />
          ))}
        </div>
      </Card>
    </div>
  );
}
