import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Card, CardHeader } from '@/components/ui/Card';
import { RPEBadge } from '@/components/ui/RPEBadge';
import { Dumbbell, Video, MessageSquare, Apple, ArrowRight } from 'lucide-react';
import type { AthleteProfile, Program } from '@/lib/types';
import { estimatedOneRM } from '@/lib/calculations';
import { fmtDate } from '@/lib/utils';

export default async function Dashboard() {
  const session = await requireSession();
  const db = getDb();

  const athlete = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string };
  const profile = JSON.parse(athlete.profile_json) as AthleteProfile;

  const programRow = db
    .prepare(
      'SELECT program_json, current_week, current_block FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(session.id) as
    | { program_json: string; current_week: number; current_block: string }
    | undefined;

  const program = programRow ? (JSON.parse(programRow.program_json) as Program) : null;
  const currentWeekNum = programRow?.current_week ?? 1;
  const currentWeek = program?.weeks.find((w) => w.weekNumber === currentWeekNum);

  // Recent sessions for e1RM
  const recentSessions = db
    .prepare(
      'SELECT exercises_json, date FROM session_logs WHERE athlete_id = ? ORDER BY date DESC LIMIT 30',
    )
    .all(session.id) as { exercises_json: string; date: string }[];

  const e1RMs: Record<string, number> = {};
  for (const s of recentSessions) {
    const exs = JSON.parse(s.exercises_json) as {
      exercise: string;
      sets: { reps: number; weight: number }[];
    }[];
    for (const ex of exs) {
      const lower = ex.exercise.toLowerCase();
      let key: string | null = null;
      if (lower.includes('squat') && !lower.includes('pause') && !lower.includes('box'))
        key = 'squat';
      else if (lower.includes('bench') && !lower.includes('close') && !lower.includes('paused'))
        key = 'bench';
      else if (lower.includes('deadlift') && !lower.includes('deficit') && !lower.includes('rack'))
        key = 'deadlift';
      if (!key) continue;
      for (const set of ex.sets) {
        const e = estimatedOneRM(set.weight, set.reps);
        if (!e1RMs[key] || e > e1RMs[key]) e1RMs[key] = e;
      }
    }
  }

  // Bodyweight latest
  const bw = db
    .prepare(
      'SELECT bodyweight, date FROM bodyweight_logs WHERE athlete_id = ? ORDER BY date DESC LIMIT 1',
    )
    .get(session.id) as { bodyweight: number; date: string } | undefined;

  // Weekly tonnage (this week)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekSessions = db
    .prepare('SELECT exercises_json FROM session_logs WHERE athlete_id = ? AND date >= ?')
    .all(session.id, weekStartStr) as { exercises_json: string }[];

  let weeklyTonnage = 0;
  for (const s of weekSessions) {
    const exs = JSON.parse(s.exercises_json) as {
      sets: { reps: number; weight: number }[];
    }[];
    for (const ex of exs) for (const set of ex.sets) weeklyTonnage += set.weight * set.reps;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-7xl">
      {/* Hero strip */}
      <div className="mb-10">
        <div className="font-mono text-xs text-chalk-mute tracking-widest mb-2">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }).toUpperCase()}
        </div>
        <h1 className="stencil-heading text-4xl sm:text-5xl text-chalk leading-none">
          GOOD TO SEE YOU,&nbsp;
          <span className="text-blood">{profile.name.split(' ')[0].toUpperCase()}</span>
        </h1>
        <div className="accent-divider mt-3 max-w-[120px]" />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatBlock
          label="Squat e1RM"
          value={e1RMs.squat ?? profile.currentMaxes.squat ?? '—'}
          unit={profile.unit}
        />
        <StatBlock
          label="Bench e1RM"
          value={e1RMs.bench ?? profile.currentMaxes.bench ?? '—'}
          unit={profile.unit}
        />
        <StatBlock
          label="Deadlift e1RM"
          value={e1RMs.deadlift ?? profile.currentMaxes.deadlift ?? '—'}
          unit={profile.unit}
        />
        <StatBlock
          label="Bodyweight"
          value={bw?.bodyweight ?? profile.bodyweight}
          unit={profile.unit}
          sublabel={bw ? `as of ${fmtDate(bw.date)}` : 'profile'}
        />
      </div>

      {/* Main row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's session */}
        <Card className="lg:col-span-2">
          <CardHeader title="Today's Session" subtitle={program ? `${program.currentBlock} · Week ${currentWeekNum}` : ''} accent />
          {!program ? (
            <div className="text-sm text-chalk-mute">
              No program yet. Generation may have failed — try regenerating from{' '}
              <Link href="/profile" className="text-blood underline">
                Profile
              </Link>
              .
            </div>
          ) : (
            (() => {
              const today = new Date().getDay(); // 0 = Sunday
              const dayIdx = ((today + 6) % 7) % (currentWeek?.days.length ?? 1);
              const day = currentWeek?.days[dayIdx] ?? currentWeek?.days[0];
              if (!day) return <div className="text-sm text-chalk-mute">Rest day. Eat. Walk.</div>;
              return (
                <div>
                  <div className="font-mono text-xs text-chalk-mute mb-1">
                    DAY {day.dayNumber} · {day.dayName}
                  </div>
                  <div className="space-y-3 mt-4">
                    {day.exercises.slice(0, 4).map((ex, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between border-b border-iron-800 pb-2"
                      >
                        <div>
                          <div className="text-chalk text-sm font-body">{ex.name}</div>
                          <div className="font-mono text-xs text-chalk-mute mt-0.5">
                            {ex.sets} × {ex.reps}
                            {ex.estimatedWeight ? ` @ ${ex.estimatedWeight}${ex.unit ?? profile.unit}` : ''}
                          </div>
                        </div>
                        <RPEBadge rpe={ex.targetRPE} />
                      </div>
                    ))}
                    {day.exercises.length > 4 && (
                      <div className="text-xs text-chalk-mute font-mono pt-1">
                        + {day.exercises.length - 4} more
                      </div>
                    )}
                  </div>
                  <Link href="/program" className="btn-primary mt-6 inline-flex items-center gap-2">
                    Open full session <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })()
          )}
        </Card>

        {/* Quick actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="This Week" />
            <div className="space-y-2 font-mono text-sm">
              <Row k="Tonnage" v={`${Math.round(weeklyTonnage).toLocaleString()} ${profile.unit}`} />
              <Row k="Sessions" v={String(weekSessions.length)} />
              <Row k="Block" v={programRow?.current_block ?? '—'} />
            </div>
          </Card>

          <QuickAction href="/formcheck" icon={<Video className="w-4 h-4" />} label="Submit a form check" />
          <QuickAction href="/chat" icon={<MessageSquare className="w-4 h-4" />} label="Ask your coach" />
          <QuickAction href="/nutrition" icon={<Apple className="w-4 h-4" />} label="Today's macros" />
          <QuickAction href="/program" icon={<Dumbbell className="w-4 h-4" />} label="Full program" />
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  unit,
  sublabel,
}: {
  label: string;
  value: number | string;
  unit?: string;
  sublabel?: string;
}) {
  return (
    <div className="chalk-card px-5 py-4">
      <div className="stencil-heading text-xs text-chalk-mute tracking-widest mb-1">{label}</div>
      <div className="data-num text-3xl text-chalk leading-none">
        {value}
        {value !== '—' && unit && (
          <span className="text-base text-chalk-mute ml-1">{unit}</span>
        )}
      </div>
      {sublabel && <div className="text-[10px] font-mono text-chalk-mute mt-1">{sublabel}</div>}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="block chalk-card card-interactive px-4 py-3 group"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3 text-sm text-chalk">
          <span className="text-blood">{icon}</span>
          {label}
        </span>
        <ArrowRight className="w-4 h-4 text-chalk-mute group-hover:text-blood transition-colors" />
      </div>
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-chalk-dim">
      <span className="text-chalk-mute uppercase text-xs tracking-widest">{k}</span>
      <span className="text-chalk">{v}</span>
    </div>
  );
}
