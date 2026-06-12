'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Video, Zap, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RPEBadge } from '@/components/ui/RPEBadge';
import { cn } from '@/lib/utils';
import type { AthleteProfile, Program, ProgramDay, Exercise } from '@/lib/types';
import { LogSessionModal } from './LogSessionModal';

interface AdjustResult {
  suggestedWeight: number;
  basisE1rm: number;
  lastActualRPE: number | null;
  reason: string;
  source: 'history' | 'profile-1rm' | 'planned';
  deloadSuggested: boolean;
  repRegressionTo: number | null;
  lift: string;
}
type AdjustMap = Record<string, AdjustResult>;

export function ProgramView({
  profile,
  program,
  currentWeek,
  programId,
}: {
  profile: AthleteProfile;
  program: Program;
  currentWeek: number;
  programId: string;
}) {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const week = program.weeks.find((w) => w.weekNumber === selectedWeek) ?? program.weeks[0];
  const [logOpen, setLogOpen] = useState<{
    day: ProgramDay;
  } | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustMap>({});

  // Re-pull autoregulated targets whenever the lifter switches weeks; this is
  // how a logged set on Monday flows into Wednesday's suggested load.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/program/adjust', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ weekNumber: selectedWeek }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.adjustments) setAdjustments(data.adjustments);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedWeek, programId]);

  const deloadFlag = Object.values(adjustments).some((a) => a.deloadSuggested);

  return (
    <div className="stagger px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-6xl">
      <div className="mb-8">
        <div className="page-kicker mb-2">
          {'// '}PROGRAM · {program.totalWeeks} WEEKS
        </div>
        <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">{program.name}</h1>
        <div className="accent-divider mt-3 max-w-[120px]" />
      </div>

      {/* Week selector */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {program.weeks.map((w) => {
            const active = w.weekNumber === selectedWeek;
            return (
              <button
                key={w.weekNumber}
                onClick={() => setSelectedWeek(w.weekNumber)}
                className={cn(
                  'px-4 py-3 stencil-heading text-xs tracking-widest border whitespace-nowrap transition-colors',
                  active
                    ? 'border-blood bg-blood text-iron-950'
                    : 'border-iron-700 text-chalk-mute hover:border-blood hover:text-chalk',
                )}
              >
                W{w.weekNumber}
                <span className="block font-mono text-[9px] opacity-70 mt-0.5">{w.blockName.slice(0, 6).toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Block & theme */}
      <div className="mb-6 chalk-card p-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <div className="stencil-heading text-2xl text-chalk">
              {week.blockName} <span className="text-chalk-mute">— Week {week.weekNumber}</span>
            </div>
            <div className="text-sm text-chalk-mute mt-1 font-body">{week.theme}</div>
          </div>
        </div>
      </div>

      {deloadFlag && (
        <div className="mb-5 bg-rpe-mod/10 border border-rpe-mod/40 p-3 text-sm text-rpe-mod flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Your e1RM is down on at least one compound. Suggested weights are{' '}
            <strong>-10%</strong> this week. Push the next block when you feel fresh.
          </span>
        </div>
      )}

      {/* Days */}
      <div className="space-y-4">
        {week.days.map((day) => (
          <DayCard
            key={day.dayNumber}
            day={day}
            weekNumber={selectedWeek}
            unit={profile.unit}
            onLog={() => setLogOpen({ day })}
            adjustments={adjustments}
          />
        ))}
      </div>

      {logOpen && (
        <LogSessionModal
          day={logOpen.day}
          weekNumber={selectedWeek}
          unit={profile.unit}
          onClose={() => setLogOpen(null)}
        />
      )}
    </div>
  );
}

function DayCard({
  day,
  weekNumber,
  unit,
  onLog,
  adjustments,
}: {
  day: ProgramDay;
  weekNumber: number;
  unit: 'lbs' | 'kg';
  onLog: () => void;
  adjustments: AdjustMap;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="text-left">
          <div className="font-mono text-xs text-chalk-mute tracking-widest">DAY {day.dayNumber}</div>
          <div className="stencil-heading text-2xl text-chalk">{day.dayName}</div>
        </div>
        <ChevronDown
          className={cn('w-5 h-5 text-chalk-mute transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mt-5">
          <div className="space-y-2">
            {day.exercises.map((ex, i) => (
              <ExerciseRow
                key={i}
                exercise={ex}
                unit={unit}
                adjustment={adjustments[`w${weekNumber}-d${day.dayNumber}-e${i}`]}
              />
            ))}
          </div>
          <div className="flex gap-3 mt-5 flex-wrap">
            <Button onClick={onLog} size="sm">
              Log this session
            </Button>
            <Link
              href={`/formcheck?lift=${guessLiftType(day)}`}
              className="btn-ghost text-xs px-3 py-2 inline-flex items-center gap-2"
            >
              <Video className="w-4 h-4" /> Submit form check
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

function ExerciseRow({
  exercise,
  unit,
  adjustment,
}: {
  exercise: Exercise;
  unit: 'lbs' | 'kg';
  adjustment?: AdjustResult;
}) {
  // Only treat the suggestion as "different" if it's from real history AND
  // actually differs from the original — otherwise just show the plan.
  const overrideActive =
    adjustment &&
    adjustment.source !== 'planned' &&
    adjustment.suggestedWeight > 0 &&
    adjustment.suggestedWeight !== exercise.estimatedWeight;
  const adjustedReps = adjustment?.repRegressionTo ?? exercise.reps;
  const displayUnit = exercise.unit ?? unit;

  return (
    <div className="border-l-2 border-iron-700 hover:border-blood transition-colors pl-4 py-2">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-chalk font-body flex items-center gap-2 flex-wrap">
            <span>{exercise.name}</span>
            {exercise.isCompetitionLift && (
              <span className="font-mono text-[9px] tracking-widest border border-blood text-blood px-1.5 py-0.5">
                COMP
              </span>
            )}
            {overrideActive && (
              <span
                title={adjustment.reason}
                className="font-mono text-[9px] tracking-widest border border-rpe-easy text-rpe-easy px-1.5 py-0.5 inline-flex items-center gap-1"
              >
                <Zap className="w-2.5 h-2.5" /> AUTO
              </span>
            )}
            {adjustment?.deloadSuggested && (
              <span className="font-mono text-[9px] tracking-widest border border-rpe-mod text-rpe-mod px-1.5 py-0.5">
                DELOAD
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-chalk-mute mt-0.5">
            {exercise.sets} ×{' '}
            {adjustment?.repRegressionTo ? (
              <>
                <span className="text-chalk">{adjustedReps}</span>
                <span className="line-through text-chalk-mute/60 ml-1">{exercise.reps}</span>
              </>
            ) : (
              exercise.reps
            )}
            {(overrideActive || exercise.estimatedWeight !== undefined) && (
              <>
                {' '}
                @{' '}
                {overrideActive ? (
                  <>
                    <span className="text-rpe-easy">{adjustment.suggestedWeight}</span>
                    <span className="text-chalk-mute">{displayUnit}</span>
                    {exercise.estimatedWeight !== undefined && (
                      <span className="line-through text-chalk-mute/60 ml-1.5">
                        {exercise.estimatedWeight}
                        {displayUnit}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-chalk">{exercise.estimatedWeight}</span>
                    <span className="text-chalk-mute">{displayUnit}</span>
                  </>
                )}
              </>
            )}
            {exercise.percentageOfMax && !overrideActive && (
              <span className="text-chalk-mute"> · {exercise.percentageOfMax}% 1RM</span>
            )}
          </div>
        </div>
        <RPEBadge rpe={exercise.targetRPE} />
      </div>
      {overrideActive && (
        <div className="text-[11px] text-rpe-easy/80 mt-1 font-mono">{adjustment.reason}</div>
      )}
      {exercise.notes && (
        <div className="text-xs text-chalk-mute mt-2 font-body italic">"{exercise.notes}"</div>
      )}
    </div>
  );
}

function guessLiftType(day: ProgramDay): string {
  for (const ex of day.exercises) {
    const n = ex.name.toLowerCase();
    if (n.includes('squat') && ex.isCompetitionLift) return 'squat';
    if (n.includes('bench') && ex.isCompetitionLift) return 'bench';
    if (n.includes('deadlift') && ex.isCompetitionLift) return 'deadlift';
  }
  for (const ex of day.exercises) {
    const n = ex.name.toLowerCase();
    if (n.includes('squat')) return 'squat';
    if (n.includes('bench')) return 'bench';
    if (n.includes('deadlift')) return 'deadlift';
  }
  return 'squat';
}
