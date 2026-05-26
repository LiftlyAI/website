'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Video } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RPEBadge } from '@/components/ui/RPEBadge';
import { cn } from '@/lib/utils';
import type { AthleteProfile, Program, ProgramDay, Exercise } from '@/lib/types';
import { LogSessionModal } from './LogSessionModal';

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

  return (
    <div className="px-8 py-10 max-w-6xl">
      <div className="mb-8">
        <div className="font-mono text-xs text-chalk-mute tracking-widest mb-1">
          PROGRAM · {program.totalWeeks} WEEKS
        </div>
        <h1 className="stencil-heading text-5xl text-chalk leading-none">{program.name}</h1>
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

      {/* Days */}
      <div className="space-y-4">
        {week.days.map((day) => (
          <DayCard
            key={day.dayNumber}
            day={day}
            unit={profile.unit}
            onLog={() => setLogOpen({ day })}
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
  unit,
  onLog,
}: {
  day: ProgramDay;
  unit: 'lbs' | 'kg';
  onLog: () => void;
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
              <ExerciseRow key={i} exercise={ex} unit={unit} />
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

function ExerciseRow({ exercise, unit }: { exercise: Exercise; unit: 'lbs' | 'kg' }) {
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
          </div>
          <div className="font-mono text-xs text-chalk-mute mt-0.5">
            {exercise.sets} × {exercise.reps}
            {exercise.estimatedWeight !== undefined && (
              <>
                {' '}
                @ <span className="text-chalk">{exercise.estimatedWeight}</span>
                <span className="text-chalk-mute">{exercise.unit ?? unit}</span>
              </>
            )}
            {exercise.percentageOfMax && (
              <span className="text-chalk-mute"> · {exercise.percentageOfMax}% 1RM</span>
            )}
          </div>
        </div>
        <RPEBadge rpe={exercise.targetRPE} />
      </div>
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
