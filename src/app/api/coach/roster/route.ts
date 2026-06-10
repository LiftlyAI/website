import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoach } from '@/lib/coach-auth';
import { getOrCreateAthleteByEmail } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { listRoster } from '@/lib/coach-data';

// Bulk-friendly on purpose: a coach migrating off TrainHeroic pastes their
// whole client list (CSV parsed client-side) in one call.
const Body = z.object({
  clients: z
    .array(z.object({ email: z.string().email(), name: z.string().optional() }))
    .min(1)
    .max(100),
});

export async function POST(req: NextRequest) {
  let coach;
  try {
    coach = await requireCoach();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const data = await req.json().catch(() => null);
  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const db = getDb();
  const link = db.prepare(
    `INSERT INTO coach_athletes (coach_id, athlete_id, status, created_at)
     VALUES (?, ?, 'active', ?)
     ON CONFLICT(coach_id, athlete_id) DO UPDATE SET status = 'active'`,
  );
  const mark = db.prepare('UPDATE athletes SET coached_by = ? WHERE id = ?');

  let added = 0;
  for (const c of parsed.data.clients) {
    const athlete = getOrCreateAthleteByEmail(c.email, c.name);
    link.run(coach.id, athlete.id, Date.now());
    mark.run(coach.id, athlete.id);
    added++;
  }

  return NextResponse.json({ ok: true, added, roster: listRoster(db, coach.id) });
}
