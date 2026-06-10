'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { ReadinessAssessment, ReadinessFlag, ReadinessLog } from '@/lib/types';

const FLAG_STYLE: Record<ReadinessFlag, { dot: string; text: string; border: string; bg: string; label: string }> = {
  green: { dot: 'bg-rpe-easy', text: 'text-rpe-easy', border: 'border-rpe-easy/40', bg: 'bg-rpe-easy/10', label: 'READY' },
  amber: { dot: 'bg-rpe-mod', text: 'text-rpe-mod', border: 'border-rpe-mod/40', bg: 'bg-rpe-mod/10', label: 'CAUTION' },
  red: { dot: 'bg-rpe-max', text: 'text-rpe-max', border: 'border-rpe-max/40', bg: 'bg-rpe-max/10', label: 'BEAT UP' },
};

export function ReadinessCard({
  readiness,
  assessment,
}: {
  readiness: ReadinessLog | null;
  assessment: ReadinessAssessment | null;
}) {
  const [open, setOpen] = useState(false);

  if (readiness && assessment) {
    const s = FLAG_STYLE[assessment.flag];
    return (
      <div className={cn('border p-3 mb-4', s.border, s.bg)}>
        <div className="flex items-start gap-2.5">
          <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', s.dot)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('font-mono text-[10px] tracking-widest', s.text)}>
                READINESS · {s.label}
              </span>
              {assessment.rpeCap != null && (
                <span className={cn('font-mono text-[9px] tracking-widest border px-1.5 py-0.5', s.border, s.text)}>
                  SOFT CAP RPE {assessment.rpeCap}
                </span>
              )}
            </div>
            <p className="text-sm text-chalk mt-1 font-body">{assessment.headline}</p>
            {assessment.suggestions.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {assessment.suggestions.map((sg, i) => (
                  <li key={i} className="text-[11px] text-chalk-mute font-body flex gap-1.5">
                    {assessment.seePtAdvice && i === 0 ? (
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-rpe-max" />
                    ) : (
                      <span className="text-chalk-mute/50">·</span>
                    )}
                    <span>{sg}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setOpen(true)}
              className="font-mono text-[10px] tracking-widest text-chalk-mute hover:text-blood mt-2"
            >
              UPDATE TODAY’S CHECK-IN →
            </button>
          </div>
        </div>
        {open && <ReadinessModal existing={readiness} onClose={() => setOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="border border-iron-800 bg-iron-900/30 p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <Activity className="w-4 h-4 text-chalk-mute shrink-0" />
        <span className="text-sm text-chalk-mute font-body">
          How are you feeling today? <span className="text-chalk-mute/60">Optional — it only ever suggests, never overrides.</span>
        </span>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost text-xs px-3 py-1.5 whitespace-nowrap"
      >
        Check in
      </button>
      {open && <ReadinessModal existing={null} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  onChange,
  goodHigh,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
  goodHigh: boolean;
}) {
  // Colour the readout by whether this value is "good" for the dial's direction.
  const good = goodHigh ? value >= 7 : value <= 4;
  const bad = goodHigh ? value <= 3 : value >= 8;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="stencil-heading text-xs text-chalk">{label}</span>
        <span
          className={cn(
            'font-mono text-sm',
            good ? 'text-rpe-easy' : bad ? 'text-rpe-max' : 'text-chalk',
          )}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-blood"
      />
      <div className="font-mono text-[9px] text-chalk-mute mt-0.5">{hint}</div>
    </label>
  );
}

function ReadinessModal({ existing, onClose }: { existing: ReadinessLog | null; onClose: () => void }) {
  const router = useRouter();
  const [sleep, setSleep] = useState(existing?.sleep ?? 7);
  const [energy, setEnergy] = useState(existing?.energy ?? 7);
  const [soreness, setSoreness] = useState(existing?.soreness ?? 3);
  const [stress, setStress] = useState(existing?.stress ?? 3);
  const [hasPain, setHasPain] = useState(existing?.pain != null);
  const [pain, setPain] = useState(existing?.pain ?? 4);
  const [painNote, setPainNote] = useState(existing?.painNote ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/readiness', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          sleep,
          energy,
          soreness,
          stress,
          pain: hasPain ? pain : null,
          painNote: hasPain ? painNote || null : null,
          note: note || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'failed');
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-start justify-center p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-lg chalk-card my-auto">
        <div className="flex items-center justify-between p-5 border-b border-iron-800">
          <div>
            <div className="font-mono text-xs text-chalk-mute">READINESS · OPTIONAL</div>
            <h2 className="stencil-heading text-2xl text-chalk">How are you today?</h2>
          </div>
          <button onClick={onClose} className="text-chalk-mute hover:text-chalk">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <Slider label="Sleep" hint="1 = wrecked · 10 = fully rested" value={sleep} onChange={setSleep} goodHigh />
          <Slider label="Energy" hint="1 = flat · 10 = firing" value={energy} onChange={setEnergy} goodHigh />
          <Slider label="Soreness" hint="1 = fresh · 10 = trashed" value={soreness} onChange={setSoreness} goodHigh={false} />
          <Slider label="Stress" hint="1 = calm · 10 = maxed out" value={stress} onChange={setStress} goodHigh={false} />

          <div className="border-t border-iron-800 pt-4">
            <label className="flex items-center gap-2 text-sm text-chalk cursor-pointer">
              <input type="checkbox" checked={hasPain} onChange={(e) => setHasPain(e.target.checked)} className="accent-blood" />
              Sharp or joint pain to flag? <span className="text-chalk-mute text-xs">(not normal soreness)</span>
            </label>
            {hasPain && (
              <div className="mt-3 space-y-3">
                <Slider label="Pain" hint="1 = niggle · 10 = severe" value={pain} onChange={setPain} goodHigh={false} />
                <input
                  type="text"
                  value={painNote}
                  onChange={(e) => setPainNote(e.target.value)}
                  placeholder="where / what kind?"
                  className="input-iron text-sm"
                />
                <p className="text-[11px] text-rpe-mod font-body">
                  Pain isn’t something to train through — this routes you to mobility work and, if it
                  persists, a PT. It never silently changes your program.
                </p>
              </div>
            )}
          </div>

          <label className="block">
            <span className="block stencil-heading text-xs text-chalk-dim mb-1.5">Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="anything worth remembering"
              className="input-iron text-sm"
            />
          </label>

          {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-iron-800">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Save check-in
          </Button>
        </div>
      </div>
    </div>
  );
}
