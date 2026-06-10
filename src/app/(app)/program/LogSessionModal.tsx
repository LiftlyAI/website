'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Check, Video, ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ProgramDay, LoopHandoff } from '@/lib/types';

interface LoggedSet {
  reps: number;
  weight: number;
  actualRPE: number;
}
interface LoggedExercise {
  exercise: string;
  sets: LoggedSet[];
}

export function LogSessionModal({
  day,
  weekNumber,
  unit,
  onClose,
}: {
  day: ProgramDay;
  weekNumber: number;
  unit: 'lbs' | 'kg';
  onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bodyweight, setBodyweight] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [handoff, setHandoff] = useState<LoopHandoff | null>(null);
  const [coachReview, setCoachReview] = useState(false);
  const [saved, setSaved] = useState(false);

  const [logged, setLogged] = useState<LoggedExercise[]>(
    day.exercises.map((ex) => ({
      exercise: ex.name,
      sets: Array.from({ length: ex.sets }, () => ({
        reps: ex.reps,
        weight: ex.estimatedWeight ?? 0,
        actualRPE: ex.targetRPE,
      })),
    })),
  );

  function updateSet(exIdx: number, setIdx: number, key: keyof LoggedSet, val: number) {
    setLogged((curr) => {
      const next = [...curr];
      next[exIdx] = { ...next[exIdx], sets: [...next[exIdx].sets] };
      next[exIdx].sets[setIdx] = { ...next[exIdx].sets[setIdx], [key]: val };
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/session/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          weekNumber,
          dayNumber: day.dayNumber,
          exercises: logged,
          bodyweight: bodyweight ? parseFloat(bodyweight) : null,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'failed');
      // Don't dead-end: hold the modal open and show what this log just
      // changed for the next session + the obvious next step (film it).
      setHandoff((data.handoff as LoopHandoff) ?? null);
      setCoachReview(Boolean(data.coachReview));
      setSaved(true);
      setSubmitting(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-start justify-center p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-2xl chalk-card my-auto">
        <div className="flex items-center justify-between p-5 border-b border-iron-800">
          <div>
            <div className="font-mono text-xs text-chalk-mute">
              {saved ? 'LOGGED' : `LOG · DAY ${day.dayNumber}`}
            </div>
            <h2 className="stencil-heading text-2xl text-chalk">{day.dayName}</h2>
          </div>
          <button onClick={onClose} className="text-chalk-mute hover:text-chalk">
            <X className="w-6 h-6" />
          </button>
        </div>

        {saved ? (
          <>
            {coachReview && (
              <div className="mx-5 mt-5 rounded-lg border border-blood/40 bg-blood/10 px-4 py-3 text-sm text-chalk-dim font-body">
                Sent to your coach — suggested load changes apply once they review and
                approve them.
              </div>
            )}
            <HandoffPanel handoff={handoff} onDone={onClose} />
          </>
        ) : (
          <>
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {logged.map((ex, exIdx) => (
                <div key={exIdx}>
                  <div className="stencil-heading text-sm text-chalk mb-2">{ex.exercise}</div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-4 gap-2 font-mono text-[10px] text-chalk-mute uppercase tracking-widest">
                      <div>Set</div>
                      <div>Reps</div>
                      <div>Weight ({unit})</div>
                      <div>RPE</div>
                    </div>
                    {ex.sets.map((s, sIdx) => (
                      <div key={sIdx} className="grid grid-cols-4 gap-2 items-center">
                        <div className="font-mono text-xs text-chalk-mute">#{sIdx + 1}</div>
                        <input
                          type="number"
                          value={s.reps}
                          onChange={(e) => updateSet(exIdx, sIdx, 'reps', parseInt(e.target.value, 10) || 0)}
                          className="input-iron py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          step="2.5"
                          value={s.weight}
                          onChange={(e) => updateSet(exIdx, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                          className="input-iron py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          step="0.5"
                          min="5"
                          max="10"
                          value={s.actualRPE}
                          onChange={(e) =>
                            updateSet(exIdx, sIdx, 'actualRPE', parseFloat(e.target.value) || 0)
                          }
                          className="input-iron py-1.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block stencil-heading text-xs text-chalk-dim mb-1.5">
                    Bodyweight ({unit})
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyweight}
                    onChange={(e) => setBodyweight(e.target.value)}
                    className="input-iron"
                  />
                </label>
                <label className="block">
                  <span className="block stencil-heading text-xs text-chalk-dim mb-1.5">Notes</span>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="how did it feel?"
                    className="input-iron"
                  />
                </label>
              </div>

              {error && <div className="text-sm text-rpe-max font-mono">{error}</div>}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-iron-800">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submit} loading={submitting}>
                Save Session
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// After a save, show what the log changed for the next session + the next step.
function HandoffPanel({
  handoff,
  onDone,
}: {
  handoff: LoopHandoff | null;
  onDone: () => void;
}) {
  const changed = (handoff?.adaptations ?? []).filter((a) => a.changed);
  const filmLift = handoff?.filmLift ?? null;

  // The coach's one-line read on this log. Best-effort: if the endpoint returns
  // null (no AI key, provider down) we just render nothing — never blocks.
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const [noteLoading, setNoteLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch('/api/coach/note', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'log' }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setCoachNote(typeof d?.note === 'string' ? d.note : null);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setNoteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
        <div className="flex items-center gap-2 text-rpe-easy">
          <Check className="w-5 h-5" />
          <span className="stencil-heading text-lg">Session logged</span>
        </div>

        {(noteLoading || coachNote) && (
          <div className="border-l-2 border-blood pl-3">
            <div className="stencil-heading text-[10px] tracking-widest text-blood mb-1 inline-flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> COACH’S READ
            </div>
            {coachNote ? (
              <p className="text-sm text-chalk font-body italic">{coachNote}</p>
            ) : (
              <p className="text-xs text-chalk-mute font-mono animate-pulse">reading your log…</p>
            )}
          </div>
        )}

        {changed.length > 0 ? (
          <div>
            <div className="stencil-heading text-xs tracking-widest mb-2 text-blood">
              WHAT THIS CHANGED
            </div>
            <div className="space-y-3">
              {changed.map((a, i) => (
                <div key={i} className="border-l-2 border-rpe-easy pl-3">
                  <div className="text-sm text-chalk flex items-center gap-2 flex-wrap">
                    <span>{a.exerciseName}</span>
                    <span className="font-mono text-[10px] text-chalk-mute">{a.whenLabel}</span>
                    {a.deload && (
                      <span className="font-mono text-[9px] tracking-widest border border-rpe-mod text-rpe-mod px-1.5 py-0.5">
                        DELOAD
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-sm mt-0.5">
                    <span className="text-rpe-easy">
                      {a.suggestedWeight}
                      {a.unit}
                    </span>
                    {a.plannedWeight > 0 && a.plannedWeight !== a.suggestedWeight && (
                      <span className="line-through text-chalk-mute/60 ml-2">
                        {a.plannedWeight}
                        {a.unit}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-chalk-mute mt-1 font-body">{a.reason}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-chalk-mute">
            Logged. Keep stacking sessions on the compounds and your next targets start
            auto-tuning to your measured e1RM.
          </p>
        )}

        {filmLift && (
          <div className="bg-iron-900/50 border border-iron-800 p-3">
            <div className="stencil-heading text-xs tracking-widest mb-2 text-chalk-mute">
              CLOSE THE LOOP
            </div>
            <Link
              href={`/formcheck?lift=${filmLift}`}
              onClick={onDone}
              className="btn-ghost text-xs px-3 py-2 inline-flex items-center gap-2"
            >
              <Video className="w-4 h-4" /> Film your {filmLift} top set
            </Link>
            <p className="text-[11px] text-chalk-mute mt-2 font-body">
              A clip reads your bar speed → a measured RPE → a sharper next target.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 p-5 border-t border-iron-800">
        <Link
          href="/program"
          onClick={onDone}
          className="btn-ghost text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          View program <ArrowRight className="w-4 h-4" />
        </Link>
        <Button onClick={onDone}>Done</Button>
      </div>
    </>
  );
}
