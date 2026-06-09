import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { liftOf } from '@/lib/programming';
import { computeHandoff } from '@/lib/handoff';

const Body = z.object({
  date: z.string(),
  weekNumber: z.number().optional(),
  dayNumber: z.number().optional(),
  exercises: z.array(
    z.object({
      exercise: z.string(),
      sets: z.array(
        z.object({
          reps: z.number(),
          weight: z.number(),
          actualRPE: z.number(),
        }),
      ),
    }),
  ),
  bodyweight: z.number().nullable().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const data = await req.json().catch(() => null);
  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const db = getDb();
  const id = uuid();
  db.prepare(
    'INSERT INTO session_logs (id, athlete_id, date, week_number, day_number, exercises_json, notes, bodyweight, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    id,
    session.id,
    parsed.data.date,
    parsed.data.weekNumber ?? null,
    parsed.data.dayNumber ?? null,
    JSON.stringify(parsed.data.exercises),
    parsed.data.notes ?? null,
    parsed.data.bodyweight ?? null,
    Date.now(),
  );

  // Mirror bodyweight into bodyweight_logs (one per date)
  if (parsed.data.bodyweight) {
    db.prepare(
      `INSERT INTO bodyweight_logs (id, athlete_id, date, bodyweight, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(athlete_id, date) DO UPDATE SET bodyweight = excluded.bodyweight`,
    ).run(uuid(), session.id, parsed.data.date, parsed.data.bodyweight, Date.now());
  }
  // Close the loop: tell the caller what this log just changed for the next
  // scheduled session of each compound, so the UI can hand off to the next step.
  const loggedLifts = [...new Set(parsed.data.exercises.map((e) => liftOf(e.exercise)))];
  const handoff = computeHandoff(
    db,
    session.id,
    loggedLifts,
    parsed.data.weekNumber ?? null,
    parsed.data.dayNumber ?? null,
  );

  return NextResponse.json({ ok: true, id, handoff });
}
