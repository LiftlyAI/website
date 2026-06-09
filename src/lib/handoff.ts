// Loop handoff — the connective tissue that turns "I just logged a set" into
// "here's what changed and what to do next." Reads the athlete's program +
// recent history and runs the existing autoregulation engine against the NEXT
// scheduled instance of each compound the lifter just touched. DB reads only.

import type DatabaseT from 'better-sqlite3';
import {
  adjustExercise,
  extractLifterSets,
  findNextOccurrence,
} from './programming';
import type {
  AthleteProfile,
  LiftType,
  LoopAdaptation,
  LoopHandoff,
  Program,
  SessionLog,
  SessionLogEntry,
  Unit,
} from './types';

const COMPOUNDS: LiftType[] = ['squat', 'bench', 'deadlift'];

export function computeHandoff(
  db: DatabaseT.Database,
  athleteId: string,
  loggedLifts: LiftType[],
  fromWeek: number | null,
  fromDay: number | null,
): LoopHandoff {
  const compounds = COMPOUNDS.filter((l) => loggedLifts.includes(l));
  const filmLift = (compounds[0] as 'squat' | 'bench' | 'deadlift' | undefined) ?? null;
  if (compounds.length === 0) return { adaptations: [], filmLift: null };

  const aRow = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(athleteId) as { profile_json: string } | undefined;
  if (!aRow?.profile_json) return { adaptations: [], filmLift };
  const profile = JSON.parse(aRow.profile_json) as AthleteProfile;

  const pRow = db
    .prepare(
      'SELECT program_json, current_week FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(athleteId) as { program_json: string; current_week: number } | undefined;
  if (!pRow) return { adaptations: [], filmLift };
  const program = JSON.parse(pRow.program_json) as Program;

  // ~60 days covers any practical autoregulation window (matches /program/adjust).
  const sinceMs = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const logRows = db
    .prepare(
      `SELECT date, exercises_json FROM session_logs
       WHERE athlete_id = ? AND created_at >= ?
       ORDER BY date DESC`,
    )
    .all(athleteId, sinceMs) as { date: string; exercises_json: string }[];
  const logs: SessionLog[] = logRows.map((r) => ({
    id: '',
    athleteId,
    date: r.date,
    weekNumber: 0,
    dayNumber: 0,
    exercises: JSON.parse(r.exercises_json) as SessionLogEntry[],
    createdAt: 0,
  }));

  const oneRm: Record<LiftType, number | null> = {
    squat: profile.currentMaxes.squat,
    bench: profile.currentMaxes.bench,
    deadlift: profile.currentMaxes.deadlift,
    other: null,
  };

  const adaptations: LoopAdaptation[] = [];
  for (const lift of compounds) {
    const occ = findNextOccurrence(program, lift, fromWeek, fromDay, { preferComp: true });
    if (!occ) continue;
    const ex = occ.exercise;
    const unit: Unit = ex.unit ?? profile.unit;
    const result = adjustExercise({
      lift,
      plannedReps: ex.reps,
      plannedTargetRPE: ex.targetRPE,
      plannedWeight: ex.estimatedWeight ?? 0,
      unit,
      profileOneRm: oneRm[lift],
      experience: profile.experience,
      history: extractLifterSets(logs, lift),
    });
    if (result.suggestedWeight <= 0) continue;
    const planned = ex.estimatedWeight ?? 0;
    adaptations.push({
      lift,
      exerciseName: ex.name,
      whenLabel: `${occ.dayName} · Week ${occ.weekNumber}`,
      plannedWeight: planned,
      suggestedWeight: result.suggestedWeight,
      reason: result.reason,
      deload: result.deloadSuggested,
      changed: result.source !== 'planned' && result.suggestedWeight !== planned,
      unit,
    });
  }

  return { adaptations, filmLift };
}
