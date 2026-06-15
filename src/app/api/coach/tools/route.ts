import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoachOwns } from '@/lib/coach-auth';
import { loadCoachingData } from '@/lib/coach-data';
import { execute, queryOne, uuid } from '@/lib/db';
import { aiGenerate, isAiKeyError, safeParseJson } from '@/lib/ai';
import { PROGRAM_SYSTEM_PROMPT, buildProgramUserPrompt } from '@/lib/prompts/program';
import type { AthleteProfile, Program } from '@/lib/types';

// Two coach-facing AI tools, both gated by roster ownership. The coach always
// stays in control: 'draft-program' writes a new program the athlete sees, and
// 'analyze' is a read-only fatigue/volume read the coach can act on.
const Body = z.object({
  athleteId: z.string().min(1),
  tool: z.enum(['draft-program', 'analyze']),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  try {
    await requireCoachOwns(parsed.data.athleteId);
  } catch (e) {
    const status = e instanceof Error && e.message === 'FORBIDDEN' ? 403 : 401;
    return NextResponse.json({ error: 'not allowed' }, { status });
  }

  if (parsed.data.tool === 'draft-program') {
    return draftProgram(parsed.data.athleteId);
  }
  return analyze(parsed.data.athleteId);
}

async function draftProgram(athleteId: string) {
  const row = await queryOne<{ profile_json: string | null }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [athleteId],
  );
  if (!row?.profile_json) return NextResponse.json({ error: 'no profile' }, { status: 400 });
  const profile = JSON.parse(row.profile_json) as AthleteProfile;

  let text = '';
  try {
    text = await aiGenerate({
      system: PROGRAM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildProgramUserPrompt(profile) }],
      maxTokens: 32000,
      temperature: 0.4,
      json: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    return NextResponse.json({ error: msg }, { status: isAiKeyError(err) ? 400 : 502 });
  }
  const program = safeParseJson<Program>(text);
  if (!program || !Array.isArray(program.weeks)) {
    return NextResponse.json({ error: 'failed to parse program' }, { status: 502 });
  }
  await execute(
    'INSERT INTO programs (id, athlete_id, program_json, current_week, current_block, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      uuid(),
      athleteId,
      JSON.stringify(program),
      1,
      program.currentBlock ?? program.weeks[0]?.blockName ?? 'Hypertrophy',
      Date.now(),
    ],
  );
  return NextResponse.json({ ok: true, weeks: program.weeks.length });
}

const ANALYZE_SYSTEM = `You are an elite powerlifting coach assistant. Given an athlete's profile, current program, and recent training logs, write a concise fatigue and volume analysis for the HEAD COACH (not the athlete). Be specific and actionable: call out fatigue signals, volume imbalances between lifts, stalling, and one or two concrete adjustments. 120 words max. Plain text, no preamble.`;

async function analyze(athleteId: string) {
  const data = await loadCoachingData(athleteId);
  if (!data) return NextResponse.json({ error: 'no coaching data' }, { status: 400 });

  const recent = data.logs.slice(0, 12).map((l) => ({
    date: l.date,
    exercises: l.exercises.map((e) => ({
      exercise: e.exercise,
      sets: e.sets.map((s) => ({ reps: s.reps, weight: s.weight, rpe: s.actualRPE })),
    })),
  }));
  const user = JSON.stringify({
    profile: {
      experience: data.profile.experience,
      goal: data.profile.goal,
      unit: data.profile.unit,
      currentMaxes: data.profile.currentMaxes,
    },
    currentWeek: data.currentWeek,
    block: data.program.currentBlock,
    recentLogs: recent,
  });

  let text = '';
  try {
    text = await aiGenerate({
      system: ANALYZE_SYSTEM,
      messages: [{ role: 'user', content: user }],
      maxTokens: 600,
      temperature: 0.5,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    return NextResponse.json({ error: msg }, { status: isAiKeyError(err) ? 400 : 502 });
  }
  return NextResponse.json({ ok: true, analysis: text.trim() });
}
