'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Video, ArrowRight, Check, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RPEBadge } from '@/components/ui/RPEBadge';
import { cn } from '@/lib/utils';
import { LogSessionModal } from '../program/LogSessionModal';
import { ReadinessCard } from './ReadinessCard';
import type { LoopAdaptation, ProgramDay, ReadinessAssessment, ReadinessLog } from '@/lib/types';

export type LoopStep = 'program' | 'resume' | 'execute' | 'review' | 'adapt';

const LOOP = ['Program', 'Execute', 'Review', 'Adapt'] as const;

function activeIndex(step: LoopStep): number {
  if (step === 'program') return 0;
  if (step === 'resume' || step === 'execute') return 1;
  if (step === 'review') return 2;
  return 3;
}

export function TodayLoopCard({
  step,
  day,
  weekNumber,
  unit,
  daysSinceLast,
  adaptations,
  filmLift,
  readiness,
  assessment,
}: {
  step: LoopStep;
  day: ProgramDay | null;
  weekNumber: number;
  unit: 'lbs' | 'kg';
  daysSinceLast: number | null;
  adaptations: LoopAdaptation[];
  filmLift: 'squat' | 'bench' | 'deadlift' | null;
  readiness: ReadinessLog | null;
  assessment: ReadinessAssessment | null;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const changed = adaptations.filter((a) => a.changed);
  // A soft, suggested ceiling from today's check-in — only shown while there's
  // training ahead today, and always framed as the lifter's call.
  const rpeCap = assessment?.rpeCap ?? null;

  return (
    <div className="chalk-card p-5">
      {/* The loop, made visible — current stage lit. */}
      <Stepper active={activeIndex(step)} />

      {/* Optional readiness check-in — never gates the loop. */}
      <div className="mt-4">
        <ReadinessCard readiness={readiness} assessment={assessment} />
      </div>

      <div className="mt-1">
        {step === 'program' && <ProgramStep />}
        {step === 'resume' && (
          <ResumeStep
            day={day}
            daysSinceLast={daysSinceLast}
            unit={unit}
            filmLift={filmLift}
            rpeCap={rpeCap}
            onLog={() => setLogOpen(true)}
          />
        )}
        {step === 'execute' && (
          <ExecuteStep
            day={day}
            unit={unit}
            changed={changed}
            filmLift={filmLift}
            rpeCap={rpeCap}
            onLog={() => setLogOpen(true)}
          />
        )}
        {step === 'review' && <ReviewStep filmLift={filmLift} />}
        {step === 'adapt' && <AdaptStep adaptations={adaptations} filmLift={filmLift} />}
      </div>

      {logOpen && day && (
        <LogSessionModal
          day={day}
          weekNumber={weekNumber}
          unit={unit}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
  );
}

function Stepper({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {LOOP.map((l, i) => (
        <div key={l} className="flex items-center gap-1.5">
          <span
            className={cn(
              'font-mono text-[10px] tracking-widest px-2 py-1 border transition-colors',
              i === active
                ? 'border-blood text-blood bg-blood/10'
                : 'border-iron-700 text-chalk-mute',
            )}
          >
            {l.toUpperCase()}
          </span>
          {i < LOOP.length - 1 && (
            <ArrowRight className={cn('w-3 h-3', i < active ? 'text-blood' : 'text-iron-700')} />
          )}
        </div>
      ))}
    </div>
  );
}

function ProgramStep() {
  return (
    <div>
      <div className="stencil-heading text-xl text-chalk">No program yet</div>
      <p className="text-sm text-chalk-mute mt-1">
        Build your block-periodized program from your profile to start the loop. (If a
        previous attempt failed, try again here.)
      </p>
      <Link href="/profile" className="btn-primary mt-4 inline-flex items-center gap-2">
        Generate a program <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function ExerciseList({ day, unit }: { day: ProgramDay; unit: 'lbs' | 'kg' }) {
  return (
    <div className="space-y-3 mt-4">
      {day.exercises.slice(0, 4).map((ex, i) => (
        <div key={i} className="flex items-center justify-between border-b border-iron-800 pb-2">
          <div>
            <div className="text-chalk text-sm font-body">{ex.name}</div>
            <div className="font-mono text-xs text-chalk-mute mt-0.5">
              {ex.sets} × {ex.reps}
              {ex.estimatedWeight ? ` @ ${ex.estimatedWeight}${ex.unit ?? unit}` : ''}
            </div>
          </div>
          <RPEBadge rpe={ex.targetRPE} />
        </div>
      ))}
      {day.exercises.length > 4 && (
        <div className="text-xs text-chalk-mute font-mono pt-1">+ {day.exercises.length - 4} more</div>
      )}
    </div>
  );
}

function RpeCapNote({ rpeCap }: { rpeCap: number | null }) {
  if (rpeCap == null) return null;
  return (
    <div className="mt-3 border border-rpe-mod/40 bg-rpe-mod/10 p-2.5 text-[12px] text-rpe-mod font-body flex gap-2">
      <span className="font-mono text-[10px] tracking-widest shrink-0 mt-0.5">CAP</span>
      <span>
        Today’s check-in suggests holding the top set to RPE {rpeCap}. Treat it as a ceiling. If the
        bar moves well, trust that over the number.
      </span>
    </div>
  );
}

function ExecuteStep({
  day,
  unit,
  changed,
  filmLift,
  rpeCap,
  onLog,
}: {
  day: ProgramDay | null;
  unit: 'lbs' | 'kg';
  changed: LoopAdaptation[];
  filmLift: 'squat' | 'bench' | 'deadlift' | null;
  rpeCap: number | null;
  onLog: () => void;
}) {
  if (!day) {
    return <div className="text-sm text-chalk-mute">Rest day. Eat. Walk. Come back tomorrow.</div>;
  }
  return (
    <div>
      <div className="font-mono text-xs text-chalk-mute mb-1">
        TODAY · DAY {day.dayNumber} · {day.dayName}
      </div>
      <div className="stencil-heading text-xl text-chalk">Train, then log it</div>
      <ExerciseList day={day} unit={unit} />
      <RpeCapNote rpeCap={rpeCap} />

      {changed.length > 0 && (
        <div className="mt-4 border border-iron-800 bg-iron-900/40 p-3">
          <div className="stencil-heading text-[10px] tracking-widest text-blood mb-2 inline-flex items-center gap-1">
            <Zap className="w-3 h-3" /> AUTO-TUNED FROM YOUR LOGS
          </div>
          <AdaptList items={changed} />
        </div>
      )}

      <div className="flex gap-3 mt-5 flex-wrap">
        <Button onClick={onLog} size="sm">
          Log today's session
        </Button>
        {filmLift && (
          <Link
            href={`/formcheck?lift=${filmLift}`}
            className="btn-ghost text-xs px-3 py-2 inline-flex items-center gap-2"
          >
            <Video className="w-4 h-4" /> Film your top set
          </Link>
        )}
      </div>
    </div>
  );
}

function ResumeStep({
  day,
  daysSinceLast,
  unit,
  filmLift,
  rpeCap,
  onLog,
}: {
  day: ProgramDay | null;
  daysSinceLast: number | null;
  unit: 'lbs' | 'kg';
  filmLift: 'squat' | 'bench' | 'deadlift' | null;
  rpeCap: number | null;
  onLog: () => void;
}) {
  return (
    <div>
      <div className="bg-rpe-mod/10 border border-rpe-mod/40 p-3 text-sm text-rpe-mod flex gap-2">
        <RotateCcw className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Welcome back. {daysSinceLast} days off. Ease in: take the first compound to RPE 6–7
          and build from there. The numbers below come from your last session, so treat them as a
          ceiling to work up to, not a target to hit.
        </span>
      </div>
      {day && (
        <>
          <div className="font-mono text-xs text-chalk-mute mb-1 mt-4">
            DAY {day.dayNumber} · {day.dayName}
          </div>
          <ExerciseList day={day} unit={unit} />
          <RpeCapNote rpeCap={rpeCap} />
          <div className="flex gap-3 mt-5 flex-wrap">
            <Button onClick={onLog} size="sm">
              Log a re-entry session
            </Button>
            {filmLift && (
              <Link
                href={`/formcheck?lift=${filmLift}`}
                className="btn-ghost text-xs px-3 py-2 inline-flex items-center gap-2"
              >
                <Video className="w-4 h-4" /> Film your top set
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewStep({ filmLift }: { filmLift: 'squat' | 'bench' | 'deadlift' | null }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-rpe-easy">
        <Check className="w-5 h-5" />
        <span className="stencil-heading text-xl">Logged for today</span>
      </div>
      <p className="text-sm text-chalk-mute mt-2">
        Close the loop: film your {filmLift ?? 'top'} set so the coach can read your bar speed and
        confirm today's RPE against how it actually felt.
      </p>
      <div className="flex gap-3 mt-4 flex-wrap">
        <Link
          href={`/formcheck${filmLift ? `?lift=${filmLift}` : ''}`}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Video className="w-4 h-4" /> Film {filmLift ?? 'your top set'}
        </Link>
        <Link href="/program" className="btn-ghost text-sm px-4 py-2 inline-flex items-center gap-2">
          Skip to program <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function AdaptStep({
  adaptations,
  filmLift,
}: {
  adaptations: LoopAdaptation[];
  filmLift: 'squat' | 'bench' | 'deadlift' | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-rpe-easy">
        <Check className="w-5 h-5" />
        <span className="stencil-heading text-xl">Squared away today</span>
      </div>
      {adaptations.length > 0 ? (
        <>
          <p className="text-sm text-chalk-mute mt-2">Where your numbers are headed next:</p>
          <div className="mt-3">
            <AdaptList items={adaptations} />
          </div>
        </>
      ) : (
        <p className="text-sm text-chalk-mute mt-2">
          Keep logging the compounds and your next targets start auto-tuning to your e1RM.
        </p>
      )}
      <div className="flex gap-3 mt-5 flex-wrap">
        <Link href="/program" className="btn-ghost text-sm px-4 py-2 inline-flex items-center gap-2">
          Full program <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/nutrition" className="btn-ghost text-sm px-4 py-2 inline-flex items-center gap-2">
          Today's macros <ArrowRight className="w-4 h-4" />
        </Link>
        {filmLift && (
          <Link
            href={`/formcheck?lift=${filmLift}`}
            className="btn-ghost text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <Video className="w-4 h-4" /> Another clip
          </Link>
        )}
      </div>
    </div>
  );
}

function AdaptList({ items }: { items: LoopAdaptation[] }) {
  return (
    <div className="space-y-2">
      {items.map((a, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between gap-3 border-b border-iron-800 pb-1.5"
        >
          <div className="text-sm text-chalk min-w-0">
            {a.exerciseName}
            <span className="font-mono text-[10px] text-chalk-mute ml-2">{a.whenLabel}</span>
          </div>
          <div className="font-mono text-sm whitespace-nowrap">
            <span className="text-rpe-easy">
              {a.suggestedWeight}
              {a.unit}
            </span>
            {a.plannedWeight > 0 && a.plannedWeight !== a.suggestedWeight && (
              <span className="line-through text-chalk-mute/50 ml-1.5">
                {a.plannedWeight}
                {a.unit}
              </span>
            )}
            {a.deload && <span className="ml-1.5 text-rpe-mod text-[10px]">DELOAD</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
