// Close the loop: turn an analysed form-check into a session_log entry in
// one click, so the next time ProgramView is opened the autoregulation
// engine has fresh data to suggest weights from.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { execute, queryOne, uuid } from '@/lib/db';
import { toLbs } from '@/lib/calculations';
import { computeHandoff } from '@/lib/handoff';
import type { AthleteProfile, CvAnalysis, LiftType } from '@/lib/types';

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

  const fc = await queryOne<{
    lift_type: string;
    load_kg: number | null;
    estimated_rpe: number | null;
    cv_json: string | null;
    ai_analysis: string | null;
  }>(
    `SELECT lift_type, load_kg, estimated_rpe, cv_json, ai_analysis
       FROM form_checks WHERE id = ? AND athlete_id = ?`,
    [parsed.data.formCheckId, session.id],
  );
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

  const aRow = await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  );
  const unit: 'kg' | 'lbs' = aRow?.profile_json
    ? (JSON.parse(aRow.profile_json) as AthleteProfile).unit
    : 'kg';
  const weight = unit === 'kg' ? loadKg : Math.round(toLbs(loadKg, 'kg'));

  // Mark the session against the active program week, if any, so the entry
  // shows up alongside manual logs.
  const pRow = await queryOne<{ current_week: number }>(
    'SELECT current_week FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    [session.id],
  );

  // Carry the form-check's top cue into the session note so the fix travels
  // with the logged set (and into the coach's context on the next read).
  let cue = '';
  try {
    const a = fc.ai_analysis
      ? (JSON.parse(fc.ai_analysis) as { priorityCues?: string[]; nextSession?: string })
      : null;
    cue = a?.priorityCues?.[0] ?? a?.nextSession ?? '';
  } catch {
    /* ai_analysis is raw text on older rows — nothing to extract */
  }
  const note =
    `Auto-logged from form check (measured RPE ${rpe}).` + (cue ? ` Cue: ${cue}` : '');

  const id = uuid();
  const today = new Date().toISOString().slice(0, 10);
  const exercises = [
    {
      exercise: LIFT_NAME[fc.lift_type] ?? fc.lift_type,
      sets: [{ reps, weight, actualRPE: rpe }],
    },
  ];
  await execute(
    `INSERT INTO session_logs
       (id, athlete_id, date, week_number, day_number, exercises_json, notes, bodyweight, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      session.id,
      today,
      pRow?.current_week ?? null,
      null,
      JSON.stringify(exercises),
      note,
      null,
      Date.now(),
    ],
  );

  const handoff = await computeHandoff(
    session.id,
    [fc.lift_type as LiftType],
    pRow?.current_week ?? null,
    null,
  );
  return NextResponse.json({ ok: true, id, weight, unit, reps, rpe, handoff });
}
