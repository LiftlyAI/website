import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { getAnthropic, COACH_MODEL, safeParseJson } from '@/lib/anthropic';
import { PROGRAM_SYSTEM_PROMPT, buildProgramUserPrompt } from '@/lib/prompts/program';
import { noviceMaxEstimate } from '@/lib/calculations';
import type { AthleteProfile, Program } from '@/lib/types';

const ProfileSchema = z.object({
  profile: z.any(), // we trust the client shape and validate fields below
  skipProgramGeneration: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  const profile: AthleteProfile = parsed.data.profile;
  if (!profile?.name || !profile.bodyweight || !profile.experience) {
    return NextResponse.json({ error: 'profile incomplete' }, { status: 400 });
  }

  // Backfill missing maxes for novices.
  if (
    profile.currentMaxes.squat == null ||
    profile.currentMaxes.bench == null ||
    profile.currentMaxes.deadlift == null
  ) {
    const est = noviceMaxEstimate(profile);
    profile.currentMaxes = {
      squat: profile.currentMaxes.squat ?? est.squat,
      bench: profile.currentMaxes.bench ?? est.bench,
      deadlift: profile.currentMaxes.deadlift ?? est.deadlift,
    };
  }

  const db = getDb();
  db.prepare(
    'UPDATE athletes SET name = ?, profile_json = ? WHERE id = ?',
  ).run(profile.name, JSON.stringify(profile), session.id);

  if (parsed.data.skipProgramGeneration) {
    return NextResponse.json({ ok: true });
  }

  // Generate program
  try {
    const program = await generateProgram(profile);
    const programId = uuid();
    db.prepare(
      'INSERT INTO programs (id, athlete_id, program_json, current_week, current_block, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(
      programId,
      session.id,
      JSON.stringify(program),
      1,
      program.currentBlock ?? program.weeks[0]?.blockName ?? 'Hypertrophy',
      Date.now(),
    );
    return NextResponse.json({ ok: true, programId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'program generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function generateProgram(profile: AthleteProfile): Promise<Program> {
  const client = getAnthropic();
  const totalWeeks =
    profile.experience === 'novice' ? 8 : profile.experience === 'intermediate' ? 12 : 16;

  const res = await client.messages.create({
    model: COACH_MODEL,
    max_tokens: 16000,
    temperature: 0.4,
    system: PROGRAM_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildProgramUserPrompt(profile) }],
  });

  const text = res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();

  let program = safeParseJson<Program>(text);

  // One repair pass.
  if (!program || !Array.isArray(program.weeks) || program.weeks.length === 0) {
    const repair = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 16000,
      temperature: 0.2,
      system:
        'You take broken or partial JSON and return ONLY a valid JSON object with the requested schema. No prose, no markdown.',
      messages: [
        {
          role: 'user',
          content: `Repair this output into the program schema. The total weeks should be ${totalWeeks}. Output ONLY valid JSON.\n\nORIGINAL:\n${text}`,
        },
      ],
    });
    const repairText = repair.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
    program = safeParseJson<Program>(repairText);
  }

  if (!program || !Array.isArray(program.weeks) || program.weeks.length === 0) {
    throw new Error('Could not parse program JSON from coach. Try regenerating.');
  }

  // Sanity defaults
  program.totalWeeks ??= totalWeeks;
  program.athlete ??= profile.name;
  program.currentBlock ??= program.weeks[0].blockName;
  program.name ??= `${totalWeeks}-Week ${profile.experience.charAt(0).toUpperCase() + profile.experience.slice(1)} Program`;

  return program;
}
