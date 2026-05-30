// Per-exercise autoregulation for the active program week. The lifter logs
// sets (manually or via a form-check "log this set"), and this endpoint
// computes the suggested weight for each upcoming compound lift from their
// most recent e1RMs on that lift.

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  adjustExercise,
  extractLifterSets,
  liftOf,
  type AdjustResult,
} from '@/lib/programming';
import type {
  AthleteProfile,
  LiftType,
  Program,
  SessionLog,
  SessionLogEntry,
} from '@/lib/types';

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const weekNumber = Number(body?.weekNumber) || null;

  const db = getDb();
  const aRow = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string } | undefined;
  if (!aRow?.profile_json) {
    return NextResponse.json({ error: 'no profile' }, { status: 400 });
  }
  const profile = JSON.parse(aRow.profile_json) as AthleteProfile;

  const pRow = db
    .prepare(
      'SELECT program_json, current_week FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(session.id) as { program_json: string; current_week: number } | undefined;
  if (!pRow) {
    return NextResponse.json({ ok: true, adjustments: {} });
  }
  const program = JSON.parse(pRow.program_json) as Program;
  const week =
    program.weeks.find((w) => w.weekNumber === (weekNumber ?? pRow.current_week)) ??
    program.weeks[0];
  if (!week) {
    return NextResponse.json({ ok: true, adjustments: {} });
  }

  // ~60 days of session history covers any practical autoregulation window.
  const sinceMs = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const logRows = db
    .prepare(
      `SELECT date, exercises_json FROM session_logs
       WHERE athlete_id = ? AND created_at >= ?
       ORDER BY date DESC`,
    )
    .all(session.id, sinceMs) as { date: string; exercises_json: string }[];
  const logs: SessionLog[] = logRows.map((r) => ({
    id: '',
    athleteId: session.id,
    date: r.date,
    weekNumber: 0,
    dayNumber: 0,
    exercises: JSON.parse(r.exercises_json) as SessionLogEntry[],
    createdAt: 0,
  }));

  // Pre-extract per-lift history once.
  const byLift: Record<LiftType, ReturnType<typeof extractLifterSets>> = {
    squat: extractLifterSets(logs, 'squat'),
    bench: extractLifterSets(logs, 'bench'),
    deadlift: extractLifterSets(logs, 'deadlift'),
    other: [],
  };
  const oneRm: Record<LiftType, number | null> = {
    squat: profile.currentMaxes.squat,
    bench: profile.currentMaxes.bench,
    deadlift: profile.currentMaxes.deadlift,
    other: null,
  };

  const adjustments: Record<string, AdjustResult & { lift: LiftType }> = {};
  for (const day of week.days) {
    day.exercises.forEach((ex, i) => {
      const lift = liftOf(ex.name);
      if (lift === 'other') return;
      const result = adjustExercise({
        lift,
        plannedReps: ex.reps,
        plannedTargetRPE: ex.targetRPE,
        plannedWeight: ex.estimatedWeight ?? 0,
        unit: ex.unit ?? profile.unit,
        profileOneRm: oneRm[lift],
        experience: profile.experience,
        history: byLift[lift],
      });
      adjustments[`w${week.weekNumber}-d${day.dayNumber}-e${i}`] = {
        ...result,
        lift,
      };
    });
  }

  return NextResponse.json({ ok: true, weekNumber: week.weekNumber, adjustments });
}
