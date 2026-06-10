import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';

// The lifter confirms the actual RPE for an analysed set. This feeds their
// personal slowdown→RPE profile for THAT lift so future estimates sharpen
// from "rough" → "estimated" → "measured". Per-lift, so a squat profile is
// separate from a bench profile.
const Body = z.object({
  formCheckId: z.string().min(1),
  actualRpe: z.number().min(4).max(10),
});

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

  const row = await queryOne<{ lift_type: string }>(
    `SELECT lift_type FROM velocity_log WHERE form_check_id = ? AND athlete_id = ?`,
    [parsed.data.formCheckId, session.id],
  );
  if (!row) {
    return NextResponse.json({ error: 'set not found' }, { status: 404 });
  }

  await execute(
    `UPDATE velocity_log SET actual_rpe = ?
     WHERE form_check_id = ? AND athlete_id = ?`,
    [parsed.data.actualRpe, parsed.data.formCheckId, session.id],
  );

  const { n } = (await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM velocity_log
       WHERE athlete_id = ? AND lift_type = ? AND actual_rpe IS NOT NULL`,
    [session.id, row.lift_type],
  ))!;

  const calibrationState = n >= 8 ? 'measured' : n >= 4 ? 'estimated' : 'rough';
  return NextResponse.json({
    ok: true,
    lift: row.lift_type,
    calibratedSets: n,
    calibrationState,
  });
}
