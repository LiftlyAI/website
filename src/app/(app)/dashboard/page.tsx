import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { Card, CardHeader } from '@/components/ui/Card';
import { Dumbbell, Video, MessageSquare, Apple, ArrowRight } from 'lucide-react';
import type {
  AthleteProfile,
  Program,
  ProgramDay,
  ReadinessAssessment,
  ReadinessLog,
} from '@/lib/types';
import { estimatedOneRM } from '@/lib/calculations';
import { computeHandoff } from '@/lib/handoff';
import { assessReadinessLog } from '@/lib/readiness';
import { computeWeeklyReview } from '@/lib/review-data';
import { fmtDate, safeJsonParse } from '@/lib/utils';
import { TodayLoopCard, type LoopStep } from './TodayLoopCard';
import { WeeklyReviewCard } from './WeeklyReviewCard';

export default async function Dashboard() {
  const session = await requireSession();

  const athlete = (await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  ))!;
  const profile = safeJsonParse<AthleteProfile>(athlete.profile_json, {} as AthleteProfile);

  const programRow = await queryOne<{
    program_json: string;
    current_week: number;
    current_block: string;
  }>(
    'SELECT program_json, current_week, current_block FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    [session.id],
  );

  const program = programRow ? safeJsonParse<Program | null>(programRow.program_json, null) : null;
  const currentWeekNum = programRow?.current_week ?? 1;
  const currentWeek = program?.weeks.find((w) => w.weekNumber === currentWeekNum);

  // Recent sessions for e1RM
  const recentSessions = await query<{ exercises_json: string; date: string }>(
    'SELECT exercises_json, date FROM session_logs WHERE athlete_id = ? ORDER BY date DESC LIMIT 30',
    [session.id],
  );

  const e1RMs: Record<string, number> = {};
  for (const s of recentSessions) {
    const exs = safeJsonParse<{
      exercise: string;
      sets: { reps: number; weight: number }[];
    }[]>(s.exercises_json, []);
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
  const bw = await queryOne<{ bodyweight: number; date: string }>(
    'SELECT bodyweight, date FROM bodyweight_logs WHERE athlete_id = ? ORDER BY date DESC LIMIT 1',
    [session.id],
  );

  // Weekly tonnage (this week)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekSessions = await query<{ exercises_json: string }>(
    'SELECT exercises_json FROM session_logs WHERE athlete_id = ? AND date >= ?',
    [session.id, weekStartStr],
  );

  let weeklyTonnage = 0;
  for (const s of weekSessions) {
    const exs = safeJsonParse<{
      sets: { reps: number; weight: number }[];
    }[]>(s.exercises_json, []);
    for (const ex of exs) for (const set of ex.sets) weeklyTonnage += set.weight * set.reps;
  }

  // ---------- Loop state: where are we in Program → Execute → Review → Adapt? ----------
  const todayStr = new Date().toISOString().slice(0, 10);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const loggedToday =
    (await queryOne<{ c: number }>(
      'SELECT COUNT(*) AS c FROM session_logs WHERE athlete_id = ? AND date = ?',
      [session.id, todayStr],
    ))!.c > 0;

  const lastRow = await queryOne<{ date: string }>(
    'SELECT date FROM session_logs WHERE athlete_id = ? ORDER BY date DESC, created_at DESC LIMIT 1',
    [session.id],
  );
  const daysSinceLast = lastRow
    ? Math.floor((Date.now() - Date.parse(lastRow.date)) / 86_400_000)
    : null;

  const filmedToday =
    (await queryOne<{ c: number }>(
      'SELECT COUNT(*) AS c FROM form_checks WHERE athlete_id = ? AND created_at >= ?',
      [session.id, startOfToday.getTime()],
    ))!.c > 0;

  // Today's scheduled day (weekday → day index, cycling the available days).
  const weekday = new Date().getDay(); // 0 = Sunday
  const dayIdx = currentWeek ? ((weekday + 6) % 7) % (currentWeek.days.length || 1) : 0;
  const todayDay: ProgramDay | null =
    currentWeek?.days[dayIdx] ?? currentWeek?.days[0] ?? null;

  // Upcoming auto-tuned targets for each compound's next scheduled instance.
  const handoff = program
    ? await computeHandoff(session.id, ['squat', 'bench', 'deadlift'], null, null)
    : { adaptations: [], filmLift: null };

  // Today's OPTIONAL readiness check-in (drives a soft cap, never gates the loop).
  const readinessRow = await queryOne<{
    id: string;
    athlete_id: string;
    date: string;
    sleep: number;
    energy: number;
    soreness: number;
    stress: number;
    pain: number | null;
    pain_note: string | null;
    note: string | null;
    created_at: number;
  }>(
    'SELECT id, athlete_id, date, sleep, energy, soreness, stress, pain, pain_note, note, created_at FROM readiness_logs WHERE athlete_id = ? AND date = ?',
    [session.id, todayStr],
  );
  const readiness: ReadinessLog | null = readinessRow
    ? {
        id: readinessRow.id,
        athleteId: readinessRow.athlete_id,
        date: readinessRow.date,
        sleep: readinessRow.sleep,
        energy: readinessRow.energy,
        soreness: readinessRow.soreness,
        stress: readinessRow.stress,
        pain: readinessRow.pain,
        painNote: readinessRow.pain_note,
        note: readinessRow.note,
        createdAt: readinessRow.created_at,
      }
    : null;
  const assessment: ReadinessAssessment | null = readiness ? assessReadinessLog(readiness) : null;

  // The Sunday tweak — planned vs actual + what the loop noticed this week.
  const weeklyReview = program ? await computeWeeklyReview(session.id) : null;

  let step: LoopStep;
  if (!program) step = 'program';
  else if (daysSinceLast != null && daysSinceLast >= 5) step = 'resume';
  else if (!loggedToday) step = 'execute';
  else if (!filmedToday) step = 'review';
  else step = 'adapt';

  const filmLift = guessFilmLift(todayDay) ?? handoff.filmLift;

  return (
    <div className="stagger px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-7xl">
      {/* Hero strip */}
      <div className="mb-10">
        <div className="page-kicker mb-2">
          {'// '}
          {new Date()
            .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            .toUpperCase()}
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

      {/* Main row — the loop spine + the week at a glance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="page-kicker mb-2">
            TODAY{program ? ` · ${programRow?.current_block ?? program.currentBlock} · WEEK ${currentWeekNum}` : ''}
          </div>
          <TodayLoopCard
            step={step}
            day={todayDay}
            weekNumber={currentWeekNum}
            unit={profile.unit}
            daysSinceLast={daysSinceLast}
            adaptations={handoff.adaptations}
            filmLift={filmLift}
            readiness={readiness}
            assessment={assessment}
          />
        </div>

        {/* This week + jump-to */}
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

      {/* Adapt, made visible — planned vs actual + the one change for next week. */}
      {weeklyReview && (
        <div className="mt-6">
          <WeeklyReviewCard review={weeklyReview} />
        </div>
      )}
    </div>
  );
}

function guessFilmLift(day: ProgramDay | null): 'squat' | 'bench' | 'deadlift' | null {
  if (!day) return null;
  for (const ex of day.exercises) {
    if (!ex.isCompetitionLift) continue;
    const n = ex.name.toLowerCase();
    if (n.includes('squat')) return 'squat';
    if (n.includes('bench')) return 'bench';
    if (n.includes('deadlift')) return 'deadlift';
  }
  for (const ex of day.exercises) {
    const n = ex.name.toLowerCase();
    if (n.includes('squat')) return 'squat';
    if (n.includes('bench')) return 'bench';
    if (n.includes('deadlift')) return 'deadlift';
  }
  return null;
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
        {value !== '—' && unit && <span className="text-base text-chalk-mute ml-1">{unit}</span>}
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
    <Link href={href} className="block chalk-card card-interactive px-4 py-3 group">
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
