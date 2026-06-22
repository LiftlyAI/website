import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getProgramData } from '@/lib/program';

// Authenticated, per-athlete data — never statically cached.
export const dynamic = 'force-dynamic';

/**
 * Native Program surface. Thin, versioned DTO derived from the same
 * `getProgramData` the web server component uses. Ships only the *current*
 * training week (block/theme/days/exercises) to keep the payload small;
 * additive-only, so a future `weeks` field won't break older clients.
 */
export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const data = await getProgramData(session.id);
  if (!data) {
    return NextResponse.json({ v: 1, hasProgram: false });
  }

  const { profile, program, currentWeek, programId } = data;
  const week =
    program.weeks.find((w) => w.weekNumber === currentWeek) ?? program.weeks[0] ?? null;

  return NextResponse.json({
    v: 1,
    hasProgram: true,
    unit: profile.unit,
    programId,
    name: program.name,
    currentBlock: program.currentBlock,
    currentWeek,
    totalWeeks: program.totalWeeks,
    week,
  });
}
