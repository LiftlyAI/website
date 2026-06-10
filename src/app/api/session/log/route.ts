import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { liftOf } from '@/lib/programming';
import { computeHandoff } from '@/lib/handoff';
import { loadCoachingData, replacePendingLoadSuggestions } from '@/lib/coach-data';
import { generateLoadSuggestions } from '@/lib/suggestions';

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

  // Coached athletes get human-in-the-loop instead: the same adaptations go to
  // their coach's pending queue, and the lifter sees none of them until the
  // coach approves. Self-serve athletes are unaffected.
  const coachedBy =
    (
      db.prepare('SELECT coached_by FROM athletes WHERE id = ?').get(session.id) as
        | { coached_by: string | null }
        | undefined
    )?.coached_by ?? null;
  if (coachedBy) {
    const coaching = loadCoachingData(db, session.id);
    if (coaching) {
      const payloads = generateLoadSuggestions({
        program: coaching.program,
        profile: coaching.profile,
        logs: coaching.logs,
        fromWeek: parsed.data.weekNumber ?? null,
        fromDay: parsed.data.dayNumber ?? null,
        lifts: loggedLifts,
      });
      replacePendingLoadSuggestions(db, coachedBy, session.id, payloads, 'session-log');
    }
    return NextResponse.json({
      ok: true,
      id,
      handoff: { ...handoff, adaptations: [] },
      coachReview: true,
    });
  }

  return NextResponse.json({ ok: true, id, handoff });
}
