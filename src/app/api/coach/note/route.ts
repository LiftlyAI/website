import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { aiGenerate, isAiKeyError } from '@/lib/ai';
import { computeHandoff } from '@/lib/handoff';
import { liftOf } from '@/lib/programming';
import { assessReadinessLog } from '@/lib/readiness';
import { buildCoachNotePrompt } from '@/lib/prompts/coachNote';
import type { AthleteProfile, LiftType, ReadinessLog, SessionLogEntry } from '@/lib/types';

const Body = z.object({ event: z.enum(['log', 'readiness']) });

// A short, human read on the latest loop event. Best-effort: any failure (no AI
// key, provider down) returns note=null so the UI just shows nothing — the loop
// never depends on this.
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const aRow = await queryOne<{ profile_json: string | null }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  );
  if (!aRow?.profile_json) return NextResponse.json({ note: null });
  const profile = JSON.parse(aRow.profile_json) as AthleteProfile;

  // Latest session log (the thing they just saved).
  const logRow = await queryOne<{
    date: string;
    week_number: number | null;
    day_number: number | null;
    exercises_json: string;
  }>(
    'SELECT date, week_number, day_number, exercises_json FROM session_logs WHERE athlete_id = ? ORDER BY date DESC, created_at DESC LIMIT 1',
    [session.id],
  );

  let loggedSummary: string | null = null;
  let loggedLifts: LiftType[] = [];
  if (logRow) {
    const exs = JSON.parse(logRow.exercises_json) as SessionLogEntry[];
    loggedLifts = [...new Set(exs.map((e) => liftOf(e.exercise)))];
    loggedSummary =
      exs
        .map((e) => {
          const top = [...e.sets]
            .filter((s) => s.weight && s.reps)
            .sort((a, b) => b.weight - a.weight)[0];
          return top ? `${e.exercise} ${top.weight}x${top.reps} @${top.actualRPE}` : null;
        })
        .filter(Boolean)
        .slice(0, 4)
        .join(', ') || null;
  }

  const handoff = await computeHandoff(
    session.id,
    loggedLifts,
    logRow?.week_number ?? null,
    logRow?.day_number ?? null,
  );

  // Today's readiness, if any.
  const todayStr = new Date().toISOString().slice(0, 10);
  const rRow = await queryOne<{
    id: string;
    athlete_id: string;
    date: string;
    sleep: number;
    energy: number;
    soreness: number;
    stress: number;
    pain: number | null;
    pain_note: string | null;
    note: string | null;
    created_at: number;
  }>(
    'SELECT id, athlete_id, date, sleep, energy, soreness, stress, pain, pain_note, note, created_at FROM readiness_logs WHERE athlete_id = ? AND date = ?',
    [session.id, todayStr],
  );
  const readiness = rRow
    ? assessReadinessLog({
        id: rRow.id,
        athleteId: rRow.athlete_id,
        date: rRow.date,
        sleep: rRow.sleep,
        energy: rRow.energy,
        soreness: rRow.soreness,
        stress: rRow.stress,
        pain: rRow.pain,
        painNote: rRow.pain_note,
        note: rRow.note,
        createdAt: rRow.created_at,
      } satisfies ReadinessLog)
    : null;

  const { system, user } = buildCoachNotePrompt({
    event: parsed.data.event,
    athleteName: profile.name?.split(' ')[0] ?? 'Lifter',
    experience: profile.experience,
    goal: profile.goal,
    loggedSummary,
    changedAdaptations: handoff.adaptations.filter((a) => a.changed),
    readiness,
  });

  try {
    const note = await aiGenerate({
      system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 120,
      temperature: 0.6,
    });
    const clean = note.replace(/^["'\s]+|["'\s]+$/g, '').split('\n')[0].trim();
    return NextResponse.json({ note: clean || null });
  } catch (err) {
    // No key configured, or the provider hiccupped — silently degrade.
    if (isAiKeyError(err)) return NextResponse.json({ note: null });
    return NextResponse.json({ note: null });
  }
}
