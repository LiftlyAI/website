import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { coachOwnsAthlete, requireCoach } from '@/lib/coach-auth';
import { getDb, uuid } from '@/lib/db';
import { loadCoachingData } from '@/lib/coach-data';
import { bestOneRms, personalizeWeek } from '@/lib/suggestions';
import type { Program, ProgramWeek } from '@/lib/types';

// One template week, fanned out to many clients, each personalized off their
// own e1RMs. Coach-initiated = already human-approved, so it applies directly.
const ExerciseT = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(12),
  reps: z.number().int().min(1).max(30),
  targetRPE: z.number().min(5).max(10),
  percentageOfMax: z.number().min(30).max(105).optional(),
  notes: z.string().optional(),
});
const Body = z.object({
  athleteIds: z.array(z.string().min(1)).min(1).max(100),
  blockName: z.string().min(1),
  theme: z.string().default(''),
  days: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1).max(7),
        dayName: z.string().min(1),
        exercises: z.array(ExerciseT).min(1),
      }),
    )
    .min(1)
    .max(7),
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
    return NextResponse.json(
      { error: 'invalid template', detail: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const db = getDb();
  const template: ProgramWeek = {
    weekNumber: 0, // set per athlete below
    blockName: parsed.data.blockName,
    theme: parsed.data.theme,
    days: parsed.data.days,
  };

  const results: { athleteId: string; ok: boolean; weekNumber?: number; reason?: string }[] =
    [];
  for (const athleteId of parsed.data.athleteIds) {
    if (!coachOwnsAthlete(db, coach.id, athleteId)) {
      results.push({ athleteId, ok: false, reason: 'not your client' });
      continue;
    }
    const coaching = loadCoachingData(db, athleteId);
    const aRow = db
      .prepare('SELECT name, profile_json FROM athletes WHERE id = ?')
      .get(athleteId) as { name: string | null; profile_json: string | null } | undefined;
    if (!aRow?.profile_json) {
      results.push({ athleteId, ok: false, reason: 'client has not onboarded yet' });
      continue;
    }
    const profile = coaching?.profile ?? JSON.parse(aRow.profile_json);
    const logs = coaching?.logs ?? [];
    const week = personalizeWeek(template, bestOneRms(profile, logs), profile.unit);

    if (coaching) {
      // Append as the next week of the existing program.
      week.weekNumber =
        Math.max(0, ...coaching.program.weeks.map((w) => w.weekNumber)) + 1;
      const program = coaching.program;
      program.weeks.push(week);
      program.totalWeeks = program.weeks.length;
      program.currentBlock = parsed.data.blockName;
      db.prepare('UPDATE programs SET program_json = ?, current_block = ? WHERE id = ?').run(
        JSON.stringify(program),
        parsed.data.blockName,
        coaching.programId,
      );
    } else {
      // No program yet: this block becomes their first one.
      week.weekNumber = 1;
      const program: Program = {
        name: `${parsed.data.blockName} (coach block)`,
        athlete: profile.name ?? aRow.name ?? '',
        currentBlock: parsed.data.blockName,
        totalWeeks: 1,
        weeks: [week],
      };
      db.prepare(
        'INSERT INTO programs (id, athlete_id, program_json, current_week, current_block, created_at) VALUES (?, ?, ?, 1, ?, ?)',
      ).run(uuid(), athleteId, JSON.stringify(program), parsed.data.blockName, Date.now());
    }
    results.push({ athleteId, ok: true, weekNumber: week.weekNumber });
  }

  return NextResponse.json({ ok: true, results });
}
