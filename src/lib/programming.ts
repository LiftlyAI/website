// Autoregulation engine — the closed loop that turns logged sets into next
// week's targets. Pure functions, no DB / I/O, so they unit-test cleanly.
//
// The pipeline:
//   logged set (weight × reps @ actual RPE)
//     -> e1RM for that set (Tuchscherer's reps×RPE -> %1RM chart)
//   recent sets per lift
//     -> rolling best e1RM (recovers from one bad session)
//   next session's prescription (reps × target RPE)
//     -> suggestedWeight = e1RM × pct(reps, targetRPE), rounded to plate step
// Plus: deload trigger when e1RM has decayed across sessions, and a
// beginner rep regression when reps are missed.

import { rpePercent } from './calculations';
import type { Exercise, LiftType, Program, SessionLog, Unit } from './types';

// ---------- Lift inference ----------

export function liftOf(name: string): LiftType {
  const n = name.toLowerCase();
  if (n.includes('squat')) return 'squat';
  if (n.includes('bench')) return 'bench';
  if (n.includes('dead') || n.includes('rdl') || n.includes('rack pull')) return 'deadlift';
  return 'other';
}

// ---------- Finding the next scheduled instance of a lift ----------
// Walks the program in (week, day) order and returns the next occurrence of
// `lift` strictly after (fromWeek, fromDay). If nothing is ahead (end of the
// program), it wraps to the first occurrence so the loop always has a "next".

export interface ProgramOccurrence {
  weekNumber: number;
  dayNumber: number;
  dayName: string;
  exercise: Exercise;
}

export function findNextOccurrence(
  program: Program,
  lift: LiftType,
  fromWeek: number | null,
  fromDay: number | null,
  opts: { preferComp?: boolean } = {},
): ProgramOccurrence | null {
  const seq: ProgramOccurrence[] = [];
  for (const w of [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber)) {
    for (const d of [...w.days].sort((a, b) => a.dayNumber - b.dayNumber)) {
      for (const ex of d.exercises) {
        if (liftOf(ex.name) !== lift) continue;
        seq.push({
          weekNumber: w.weekNumber,
          dayNumber: d.dayNumber,
          dayName: d.dayName,
          exercise: ex,
        });
      }
    }
  }
  if (seq.length === 0) return null;

  const isAhead = (o: ProgramOccurrence) =>
    fromWeek == null
      ? true
      : o.weekNumber > fromWeek ||
        (o.weekNumber === fromWeek && (fromDay == null || o.dayNumber > fromDay));

  const ahead = seq.filter(isAhead);
  const pool = ahead.length > 0 ? ahead : seq; // wrap if nothing scheduled ahead
  if (opts.preferComp) {
    const comp = pool.find((o) => o.exercise.isCompetitionLift);
    if (comp) return comp;
  }
  return pool[0];
}

// ---------- e1RM from a logged set ----------

export function e1rmFromSet(weight: number, reps: number, actualRPE: number): number {
  if (!weight || !reps) return 0;
  const pct = rpePercent(reps, actualRPE);
  if (pct <= 0) return 0;
  return Math.round(weight / pct);
}

// ---------- Plate-rounded suggested weight ----------

export function plateStep(unit: Unit): number {
  return unit === 'kg' ? 2.5 : 5;
}

export function roundToStep(weight: number, unit: Unit): number {
  const step = plateStep(unit);
  return Math.round(weight / step) * step;
}

export function suggestedWeight(
  e1rm: number,
  reps: number,
  targetRPE: number,
  unit: Unit,
): number {
  if (!e1rm) return 0;
  return roundToStep(e1rm * rpePercent(reps, targetRPE), unit);
}

// ---------- Pulling working sets out of session logs ----------

export interface LoggedSet {
  date: string;
  exercise: string;
  weight: number;
  reps: number;
  actualRPE: number;
  e1rm: number;
}

export function extractLifterSets(
  logs: SessionLog[],
  lift: LiftType,
): LoggedSet[] {
  const out: LoggedSet[] = [];
  for (const log of logs) {
    for (const ex of log.exercises) {
      if (liftOf(ex.exercise) !== lift) continue;
      for (const s of ex.sets) {
        // Skip warm-ups (very low RPE) and unfilled rows.
        if (!s.weight || !s.reps || !s.actualRPE) continue;
        if (s.actualRPE < 5) continue;
        out.push({
          date: log.date,
          exercise: ex.exercise,
          weight: s.weight,
          reps: s.reps,
          actualRPE: s.actualRPE,
          e1rm: e1rmFromSet(s.weight, s.reps, s.actualRPE),
        });
      }
    }
  }
  // Newest first.
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out;
}

// ---------- Autoregulated next-session prescription ----------

export interface AdjustResult {
  suggestedWeight: number; // rounded, lifter's unit
  basisE1rm: number; // the e1RM we computed the suggestion from
  lastActualRPE: number | null;
  reason: string; // short human-readable explanation
  source: 'history' | 'profile-1rm' | 'planned';
  deloadSuggested: boolean;
  repRegressionTo: number | null; // for beginners: drop one rep if reps were missed
}

export interface AdjustInput {
  lift: LiftType;
  plannedReps: number;
  plannedTargetRPE: number;
  plannedWeight: number; // the program's original suggestion (fallback)
  unit: Unit;
  profileOneRm: number | null; // from athlete profile, fallback if no history
  experience: 'novice' | 'intermediate' | 'advanced';
  history: LoggedSet[]; // newest first, filtered to this lift
}

export function adjustExercise(input: AdjustInput): AdjustResult {
  const { lift, plannedReps, plannedTargetRPE, plannedWeight, unit, profileOneRm } = input;

  if (input.history.length === 0) {
    if (profileOneRm) {
      return {
        suggestedWeight: suggestedWeight(profileOneRm, plannedReps, plannedTargetRPE, unit),
        basisE1rm: profileOneRm,
        lastActualRPE: null,
        reason: `From your stated ${lift} 1RM — no logged sets yet.`,
        source: 'profile-1rm',
        deloadSuggested: false,
        repRegressionTo: null,
      };
    }
    return {
      suggestedWeight: plannedWeight,
      basisE1rm: 0,
      lastActualRPE: null,
      reason: 'No logged sets yet — using the program estimate.',
      source: 'planned',
      deloadSuggested: false,
      repRegressionTo: null,
    };
  }

  // Use the best e1RM from the last ~3 sessions of this lift. Most-recent
  // session dominates: weight it twice in the rolling best.
  const recent = input.history.slice(0, 12); // last few sessions worth of sets
  const lastSessionDate = recent[0].date;
  const lastSets = recent.filter((s) => s.date === lastSessionDate);
  const bestRecent = Math.max(...recent.map((s) => s.e1rm));
  const bestLastSession = Math.max(...lastSets.map((s) => s.e1rm));
  const basisE1rm = Math.round((bestRecent + bestLastSession) / 2);

  const lastActualRPE = Math.max(...lastSets.map((s) => s.actualRPE));

  // Deload trigger: e1RM has fallen ≥ 4% across the last 2 sessions.
  const sessions = sessionBestE1rms(recent);
  const deloadSuggested =
    sessions.length >= 3 &&
    sessions[0] < sessions[2] * 0.96 &&
    sessions[1] < sessions[2] * 0.97;

  // Rep regression (beginner only): if the last session missed reps at high
  // RPE, drop a rep on the prescription for the next session.
  let repRegressionTo: number | null = null;
  const missedReps =
    lastSets.length > 0 &&
    lastSets.some((s) => s.reps < plannedReps && s.actualRPE >= 9);
  if (input.experience === 'novice' && missedReps && plannedReps > 2) {
    repRegressionTo = plannedReps - 1;
  }

  const repsForSuggestion = repRegressionTo ?? plannedReps;
  let weight = suggestedWeight(basisE1rm, repsForSuggestion, plannedTargetRPE, unit);
  // If a deload is suggested but the lifter still trains, cap at -10%.
  if (deloadSuggested) {
    weight = roundToStep(weight * 0.9, unit);
  }

  let reason: string;
  if (deloadSuggested) {
    reason = `e1RM has dropped across recent sessions — deload week (-10%).`;
  } else if (repRegressionTo) {
    reason = `Missed reps at RPE ${lastActualRPE} last session — dropping to ${repRegressionTo}s to rebuild.`;
  } else {
    reason = `From your last ${lift} session's e1RM (${basisE1rm} ${unit}, RPE ${lastActualRPE}).`;
  }

  return {
    suggestedWeight: weight,
    basisE1rm,
    lastActualRPE,
    reason,
    source: 'history',
    deloadSuggested,
    repRegressionTo,
  };
}

function sessionBestE1rms(sets: LoggedSet[]): number[] {
  // Group by date (already newest-first), pick the best per session.
  const byDate = new Map<string, number>();
  for (const s of sets) {
    byDate.set(s.date, Math.max(byDate.get(s.date) ?? 0, s.e1rm));
  }
  return [...byDate.values()];
}

// ---------- Stage-aware frequency hint (used by the prompt + UI labels) ----------

export interface StagePlan {
  stage: 'beginner' | 'intermediate' | 'advanced';
  bench: { sessionsPerWeek: number; intensityRotation: string };
  squat: { sessionsPerWeek: number; intensityRotation: string };
  deadlift: { sessionsPerWeek: number; intensityRotation: string };
  rpeBand: string;
  notes: string;
}

export function stagePlan(
  experience: 'novice' | 'intermediate' | 'advanced',
): StagePlan {
  if (experience === 'novice') {
    return {
      stage: 'beginner',
      bench: { sessionsPerWeek: 3, intensityRotation: 'flat RPE 7–8, weekly progression' },
      squat: { sessionsPerWeek: 2, intensityRotation: 'flat RPE 7–8, weekly progression' },
      deadlift: { sessionsPerWeek: 1, intensityRotation: 'flat RPE 7–8, weekly progression' },
      rpeBand: 'RPE 7–8 throughout, with a weekly AMRAP to calibrate effort.',
      notes:
        'Linear progression session-to-session. Rep regression on stall (3×5 → 3×4 → rebuild). Deload only when genuinely beat up.',
    };
  }
  if (experience === 'intermediate') {
    return {
      stage: 'intermediate',
      bench: {
        sessionsPerWeek: 4,
        intensityRotation: 'rotate H / L / M-H / L across the week',
      },
      squat: { sessionsPerWeek: 2, intensityRotation: 'one competition, one variation (SSB / pause / pin)' },
      deadlift: { sessionsPerWeek: 2, intensityRotation: 'one competition stance, one opposite stance / deficit' },
      rpeBand: 'Comp lifts RPE 7–9 within a block; autoregulate daily.',
      notes:
        'Block-over-block progression (4–6 wk blocks). Keep parameters constant within a block; change one variable next block. Track e1RM as the progress metric.',
    };
  }
  return {
    stage: 'advanced',
    bench: { sessionsPerWeek: 5, intensityRotation: 'high frequency; mix board / pin / paused' },
    squat: { sessionsPerWeek: 3, intensityRotation: 'comp + SSB or pin to spare joints' },
    deadlift: { sessionsPerWeek: 2, intensityRotation: 'comp + block pull / deficit / opposite stance' },
    rpeBand: 'Individualised: some respond to high-intensity low-vol, others to RPE 6–7 high-vol.',
    notes:
      'Block sequencing matters: a work-capacity block can drop e1RM short-term but compounds two blocks later. Use the wider exercise pool to bypass joint bottlenecks.',
  };
}
