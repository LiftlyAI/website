import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { readinessModifier } from '@/lib/readiness';

const dial = z.number().int().min(1).max(10);

const Body = z.object({
  date: z.string(),
  sleep: dial,
  energy: dial,
  soreness: dial,
  stress: dial,
  pain: dial.nullable().optional(),
  painNote: z.string().max(500).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
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
  const b = parsed.data;
  const db = getDb();

  // One report per day — re-submitting today just updates it.
  db.prepare(
    `INSERT INTO readiness_logs
       (id, athlete_id, date, sleep, energy, soreness, stress, pain, pain_note, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(athlete_id, date) DO UPDATE SET
       sleep = excluded.sleep,
       energy = excluded.energy,
       soreness = excluded.soreness,
       stress = excluded.stress,
       pain = excluded.pain,
       pain_note = excluded.pain_note,
       note = excluded.note`,
  ).run(
    uuid(),
    session.id,
    b.date,
    b.sleep,
    b.energy,
    b.soreness,
    b.stress,
    b.pain ?? null,
    b.painNote ?? null,
    b.note ?? null,
    Date.now(),
  );

  const assessment = readinessModifier({
    sleep: b.sleep,
    energy: b.energy,
    soreness: b.soreness,
    stress: b.stress,
    pain: b.pain ?? null,
  });

  return NextResponse.json({ ok: true, assessment });
}
