// Close the loop: turn an analysed form-check into a session_log entry in
// one click, so the next time ProgramView is opened the autoregulation
// engine has fresh data to suggest weights from.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { toLbs } from '@/lib/calculations';
import type { AthleteProfile, CvAnalysis } from '@/lib/types';

const Body = z.object({
  formCheckId: z.string().min(1),
  weightOverride: z.number().positive().optional(),
  repsOverride: z.number().int().positive().optional(),
  rpeOverride: z.number().min(4).max(10).optional(),
});

const LIFT_NAME: Record<string, string> = {
  bench: 'Bench Press',
  squat: 'Squat',
  deadlift: 'Deadlift',
};

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const db = getDb();
  const fc = db
    .prepare(
      `SELECT lift_type, load_kg, estimated_rpe, cv_json
       FROM form_checks WHERE id = ? AND athlete_id = ?`,
    )
    .get(parsed.data.formCheckId, session.id) as
    | {
        lift_type: string;
        load_kg: number | null;
        estimated_rpe: number | null;
        cv_json: string | null;
      }
    | undefined;
  if (!fc) {
    return NextResponse.json({ error: 'form check not found' }, { status: 404 });
  }

  const cv = fc.cv_json ? (JSON.parse(fc.cv_json) as CvAnalysis) : null;
  const reps = parsed.data.repsOverride ?? cv?.summary?.repCount ?? 0;
  const rpe = parsed.data.rpeOverride ?? fc.estimated_rpe;
  const loadKg = parsed.data.weightOverride ?? fc.load_kg;
  if (!reps || !rpe || !loadKg) {
    return NextResponse.json(
      {
        error:
          'need reps, RPE, and load to log a session — re-analyse with a load entered, or pass overrides.',
      },
      { status: 400 },
    );
  }

  const aRow = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string } | undefined;
  const unit: 'kg' | 'lbs' = aRow?.profile_json
    ? (JSON.parse(aRow.profile_json) as AthleteProfile).unit
    : 'kg';
  const weight = unit === 'kg' ? loadKg : Math.round(toLbs(loadKg, 'kg'));

  // Mark the session against the active program week, if any, so the entry
  // shows up alongside manual logs.
  const pRow = db
    .prepare(
      'SELECT current_week FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(session.id) as { current_week: number } | undefined;

  const id = uuid();
  const today = new Date().toISOString().slice(0, 10);
  const exercises = [
    {
      exercise: LIFT_NAME[fc.lift_type] ?? fc.lift_type,
      sets: [{ reps, weight, actualRPE: rpe }],
    },
  ];
  db.prepare(
    `INSERT INTO session_logs
       (id, athlete_id, date, week_number, day_number, exercises_json, notes, bodyweight, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    session.id,
    today,
    pRow?.current_week ?? null,
    null,
    JSON.stringify(exercises),
    `Auto-logged from form check (measured RPE ${rpe}).`,
    null,
    Date.now(),
  );
  return NextResponse.json({ ok: true, id, weight, unit, reps, rpe });
}
