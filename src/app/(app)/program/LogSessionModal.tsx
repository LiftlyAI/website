'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ProgramDay } from '@/lib/types';

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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'failed');
      }
      router.refresh();
      onClose();
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
            <div className="font-mono text-xs text-chalk-mute">LOG · DAY {day.dayNumber}</div>
            <h2 className="stencil-heading text-2xl text-chalk">{day.dayName}</h2>
          </div>
          <button onClick={onClose} className="text-chalk-mute hover:text-chalk">
            <X className="w-6 h-6" />
          </button>
        </div>

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
      </div>
    </div>
  );
}
