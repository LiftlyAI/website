import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getProgressData, type E1RMPoint } from '@/lib/progress';

// Authenticated, per-athlete data — never statically cached.
export const dynamic = 'force-dynamic';

type Lift = 'squat' | 'bench' | 'deadlift';

function best(points: E1RMPoint[], lift: Lift): number | null {
  let m: number | null = null;
  for (const p of points) {
    const v = p[lift];
    if (v != null && (m === null || v > m)) m = v;
  }
  return m;
}

function current(points: E1RMPoint[], lift: Lift): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i][lift];
    if (v != null) return v;
  }
  return null;
}

// Sum of present lifts, or null when none are logged (so the app can show "—").
function sumOrNull(...vals: (number | null)[]): number | null {
  const present = vals.filter((v): v is number => v != null);
  return present.length ? present.reduce((a, b) => a + b, 0) : null;
}

/**
 * Native Progress surface. Thin, versioned DTO derived from the same
 * `getProgressData` the web server component uses, plus a server-computed PR
 * summary so the Android/iOS clients stay thin. Additive-only: keep old fields.
 */
export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { profile, e1rms, bw, volume } = await getProgressData(session.id);

  const bestPr = {
    squat: best(e1rms, 'squat'),
    bench: best(e1rms, 'bench'),
    deadlift: best(e1rms, 'deadlift'),
  };
  const currentPr = {
    squat: current(e1rms, 'squat'),
    bench: current(e1rms, 'bench'),
    deadlift: current(e1rms, 'deadlift'),
  };

  return NextResponse.json({
    v: 1,
    unit: profile.unit,
    summary: {
      best: { ...bestPr, total: sumOrNull(bestPr.squat, bestPr.bench, bestPr.deadlift) },
      current: { ...currentPr, total: sumOrNull(currentPr.squat, currentPr.bench, currentPr.deadlift) },
      latestBodyweight: bw.length ? bw[bw.length - 1].bw : null,
    },
    e1rms,
    bodyweight: bw,
    volume,
  });
}
