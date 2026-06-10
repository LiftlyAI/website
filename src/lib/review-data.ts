// Weekly-review data assembly — the DB-touching half (mirrors handoff.ts). Pulls
// the week's planned-vs-actual numbers and the inputs the pure decision rules
// need, then hands off to the pure evaluateDecisions / buildWeeklyReview. Keeping
// the I/O here means the rule logic stays unit-testable in isolation.

import type DatabaseT from 'better-sqlite3';
import { estimatedOneRM } from './calculations';
import { liftOf } from './programming';
import { evaluateDecisions, type DecisionContext, type FormCheckSummary, type ReadinessDay, type SessionE1rm } from './decision-rules';
import { buildWeeklyReview, type WeeklyLiftLine } from './weekly-review';
import type {
  AthleteProfile,
  CvAnalysis,
  LiftType,
  Program,
  SessionLogEntry,
  Unit,
  WeeklyReview,
} from './types';

const COMPOUNDS: LiftType[] = ['squat', 'bench', 'deadlift'];

function weekStartISO(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d.toISOString().slice(0, 10);
}

export function computeWeeklyReview(db: DatabaseT.Database, athleteId: string): WeeklyReview | null {
  const aRow = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(athleteId) as { profile_json: string | null } | undefined;
  if (!aRow?.profile_json) return null;
  const profile = JSON.parse(aRow.profile_json) as AthleteProfile;
  const unit: Unit = profile.unit;

  const pRow = db
    .prepare(
      'SELECT program_json, current_week, current_block FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(athleteId) as
    | { program_json: string; current_week: number; current_block: string | null }
    | undefined;
  if (!pRow) return null;
  const program = JSON.parse(pRow.program_json) as Program;
  const currentWeek =
    program.weeks.find((w) => w.weekNumber === pRow.current_week) ?? program.weeks[0] ?? null;

  const weekStart = weekStartISO();

  // ---- Planned, from the program's current week ----
  const plannedSessions = currentWeek?.days.length ?? profile.trainingDaysPerWeek;
  let plannedTonnage = 0;
  const plannedTop: Partial<Record<LiftType, number>> = {};
  for (const d of currentWeek?.days ?? []) {
    for (const ex of d.exercises) {
      const w = ex.estimatedWeight ?? 0;
      plannedTonnage += ex.sets * ex.reps * w;
      const lift = liftOf(ex.name);
      if (lift !== 'other' && w > 0) {
        // Prefer the heaviest planned working set for that lift this week.
        if ((plannedTop[lift] ?? 0) < w) plannedTop[lift] = w;
      }
    }
  }

  // ---- Actual, from this week's logs ----
  const weekRows = db
    .prepare('SELECT date, exercises_json FROM session_logs WHERE athlete_id = ? AND date >= ?')
    .all(athleteId, weekStart) as { date: string; exercises_json: string }[];
  const sessionDates = new Set<string>();
  let actualTonnage = 0;
  const actualTop: Partial<Record<LiftType, number>> = {};
  for (const r of weekRows) {
    sessionDates.add(r.date);
    const exs = JSON.parse(r.exercises_json) as SessionLogEntry[];
    for (const ex of exs) {
      const lift = liftOf(ex.exercise);
      for (const s of ex.sets) {
        if (!s.weight || !s.reps) continue;
        actualTonnage += s.weight * s.reps;
        if (lift !== 'other' && (actualTop[lift] ?? 0) < s.weight) actualTop[lift] = s.weight;
      }
    }
  }

  const lifts: WeeklyLiftLine[] = COMPOUNDS.map((lift) => ({
    lift,
    plannedTopWeight: plannedTop[lift] ?? null,
    actualTopWeight: actualTop[lift] ?? null,
  })).filter((l) => l.plannedTopWeight != null || l.actualTopWeight != null);

  // ---- Decision-rule inputs ----
  // Readiness, last week, newest-first.
  const rRows = db
    .prepare(
      'SELECT date, soreness, pain FROM readiness_logs WHERE athlete_id = ? ORDER BY date DESC LIMIT 7',
    )
    .all(athleteId) as { date: string; soreness: number; pain: number | null }[];
  const readiness: ReadinessDay[] = rRows.map((r) => ({
    date: r.date,
    soreness: r.soreness,
    pain: r.pain,
  }));

  // Recent form checks, newest-first, with CV-derived faults + velocity loss.
  const fcRows = db
    .prepare(
      'SELECT lift_type, ai_analysis, cv_json, created_at FROM form_checks WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 6',
    )
    .all(athleteId) as {
    lift_type: string;
    ai_analysis: string | null;
    cv_json: string | null;
    created_at: number;
  }[];
  const formChecks: FormCheckSummary[] = fcRows.map((r) => {
    let formNotes: string[] = [];
    let velocityLossPct: number | null = null;
    if (r.cv_json) {
      try {
        const cv = JSON.parse(r.cv_json) as CvAnalysis;
        formNotes = [...(cv.summary?.formNotes ?? [])];
        if (cv.summary?.barPathNote) formNotes.push(cv.summary.barPathNote);
        velocityLossPct = cv.summary?.velocityLossPct ?? null;
      } catch {
        /* malformed cv — skip */
      }
    }
    return {
      date: new Date(r.created_at).toISOString().slice(0, 10),
      lift: (COMPOUNDS.includes(r.lift_type as LiftType) ? r.lift_type : 'other') as LiftType,
      formNotes,
      velocityLossPct,
    };
  });

  // e1RM per session per lift across the block window (~60d), oldest-first.
  const blockRows = db
    .prepare(
      `SELECT date, exercises_json FROM session_logs
       WHERE athlete_id = ? AND created_at >= ?
       ORDER BY date ASC`,
    )
    .all(athleteId, Date.now() - 60 * 24 * 60 * 60 * 1000) as {
    date: string;
    exercises_json: string;
  }[];
  const sessionsByLift: Partial<Record<LiftType, SessionE1rm[]>> = {};
  for (const lift of COMPOUNDS) sessionsByLift[lift] = [];
  for (const r of blockRows) {
    const exs = JSON.parse(r.exercises_json) as SessionLogEntry[];
    const best: Partial<Record<LiftType, number>> = {};
    for (const ex of exs) {
      const lift = liftOf(ex.exercise);
      if (lift === 'other') continue;
      for (const s of ex.sets) {
        if (!s.weight || !s.reps) continue;
        const e = estimatedOneRM(s.weight, s.reps);
        if ((best[lift] ?? 0) < e) best[lift] = e;
      }
    }
    for (const lift of COMPOUNDS) {
      if (best[lift]) sessionsByLift[lift]!.push({ date: r.date, e1rm: best[lift]! });
    }
  }

  const ctx: DecisionContext = {
    today: new Date().toISOString().slice(0, 10),
    unit,
    readiness,
    formChecks,
    sessionsByLift,
    blockName: pRow.current_block ?? program.currentBlock ?? null,
  };
  const findings = evaluateDecisions(ctx);

  return buildWeeklyReview({
    weekStart,
    blockName: pRow.current_block ?? program.currentBlock ?? null,
    unit,
    plannedSessions,
    actualSessions: sessionDates.size,
    plannedTonnage: plannedTonnage > 0 ? plannedTonnage : null,
    actualTonnage,
    lifts,
    findings,
  });
}
