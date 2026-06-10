// Coach suggestion engine — pure functions, no DB / I/O (mirrors programming.ts).
//
// generateLoadSuggestions runs the SAME autoregulation as the lifter-facing
// handoff (adjustExercise against the next scheduled occurrence) but returns
// the occurrence coordinates so an approval can be applied to the program JSON
// later. Only actual changes are queued — a suggestion equal to the plan is
// noise in a 55-client queue.

import {
  adjustExercise,
  extractLifterSets,
  findNextOccurrence,
  liftOf,
  roundToStep,
  suggestedWeight,
} from './programming';
import type {
  AthleteProfile,
  LiftType,
  LoadSuggestionPayload,
  Program,
  ProgramWeek,
  SessionLog,
  Unit,
} from './types';

const COMPOUNDS: LiftType[] = ['squat', 'bench', 'deadlift'];

export interface GenerateInput {
  program: Program;
  profile: AthleteProfile;
  logs: SessionLog[]; // recent history, any order (extractLifterSets sorts)
  fromWeek: number | null;
  fromDay: number | null;
  lifts?: LiftType[]; // default: all three compounds
}

export function generateLoadSuggestions(input: GenerateInput): LoadSuggestionPayload[] {
  const lifts = (input.lifts ?? COMPOUNDS).filter((l) => COMPOUNDS.includes(l));
  const oneRm: Record<LiftType, number | null> = {
    squat: input.profile.currentMaxes.squat,
    bench: input.profile.currentMaxes.bench,
    deadlift: input.profile.currentMaxes.deadlift,
    other: null,
  };

  const out: LoadSuggestionPayload[] = [];
  for (const lift of lifts) {
    const occ = findNextOccurrence(input.program, lift, input.fromWeek, input.fromDay, {
      preferComp: true,
    });
    if (!occ) continue;
    const ex = occ.exercise;
    const unit: Unit = ex.unit ?? input.profile.unit;
    const result = adjustExercise({
      lift,
      plannedReps: ex.reps,
      plannedTargetRPE: ex.targetRPE,
      plannedWeight: ex.estimatedWeight ?? 0,
      unit,
      profileOneRm: oneRm[lift],
      experience: input.profile.experience,
      history: extractLifterSets(input.logs, lift),
    });
    if (result.suggestedWeight <= 0) continue;
    const planned = ex.estimatedWeight ?? 0;
    const changed = result.source !== 'planned' && result.suggestedWeight !== planned;
    if (!changed && !result.deloadSuggested) continue;
    out.push({
      lift,
      exerciseName: ex.name,
      weekNumber: occ.weekNumber,
      dayNumber: occ.dayNumber,
      dayName: occ.dayName,
      plannedWeight: planned,
      suggestedWeight: result.suggestedWeight,
      reason: result.reason,
      deload: result.deloadSuggested,
      unit,
    });
  }
  return out;
}

// ---------- Applying an approved suggestion to the program ----------

export interface ApplyResult {
  program: Program;
  applied: boolean; // false = the targeted exercise no longer exists
}

export function applyLoadSuggestion(
  program: Program,
  payload: LoadSuggestionPayload,
  finalWeight: number,
): ApplyResult {
  const next: Program = JSON.parse(JSON.stringify(program));
  for (const w of next.weeks) {
    if (w.weekNumber !== payload.weekNumber) continue;
    for (const d of w.days) {
      if (d.dayNumber !== payload.dayNumber) continue;
      for (const ex of d.exercises) {
        if (ex.name !== payload.exerciseName) continue;
        ex.estimatedWeight = finalWeight;
        ex.unit = payload.unit;
        return { program: next, applied: true };
      }
    }
  }
  return { program, applied: false };
}

// ---------- Bulk templating: one block, personalized per athlete ----------

// Best e1RM per compound: the stronger of the stated profile max and anything
// actually logged (the log wins as soon as the lifter out-lifts their intake).
export function bestOneRms(
  profile: AthleteProfile,
  logs: SessionLog[],
): Partial<Record<LiftType, number | null>> {
  const out: Partial<Record<LiftType, number | null>> = {};
  for (const lift of COMPOUNDS) {
    const stated = profile.currentMaxes[lift as 'squat' | 'bench' | 'deadlift'] ?? 0;
    const sets = extractLifterSets(logs, lift);
    const logged = sets.length > 0 ? Math.max(...sets.map((s) => s.e1rm)) : 0;
    const best = Math.max(stated, logged);
    out[lift] = best > 0 ? best : null;
  }
  return out;
}

// Fill a template week's weights off one athlete's e1RMs. percentageOfMax wins
// when given; otherwise the reps×RPE chart sets the load. Exercises with no
// usable e1RM (accessories, unknown lifts) are left without a weight — the
// lifter autoregulates those.
export function personalizeWeek(
  template: ProgramWeek,
  oneRms: Partial<Record<LiftType, number | null>>,
  unit: Unit,
): ProgramWeek {
  const week: ProgramWeek = JSON.parse(JSON.stringify(template));
  for (const d of week.days) {
    for (const ex of d.exercises) {
      const lift = liftOf(ex.name);
      const e1rm = lift === 'other' ? null : oneRms[lift] ?? null;
      if (!e1rm) {
        delete ex.estimatedWeight;
        continue;
      }
      ex.estimatedWeight = ex.percentageOfMax
        ? roundToStep((e1rm * ex.percentageOfMax) / 100, unit)
        : suggestedWeight(e1rm, ex.reps, ex.targetRPE, unit);
      ex.unit = unit;
    }
  }
  return week;
}
