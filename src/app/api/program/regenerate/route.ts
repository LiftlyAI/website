import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { aiGenerate, isAiKeyError, safeParseJson } from '@/lib/ai';
import { PROGRAM_SYSTEM_PROMPT, buildProgramUserPrompt } from '@/lib/prompts/program';
import type { AthleteProfile, Program } from '@/lib/types';

export async function POST() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const row = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string } | undefined;
  if (!row?.profile_json) {
    return NextResponse.json({ error: 'no profile' }, { status: 400 });
  }

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
    // Surface a snippet of the raw output so this is diagnosable instead of
    // a silent dead end.
    return NextResponse.json(
      {
        error: 'failed to parse program',
        rawPreview: text.slice(0, 400),
        rawLength: text.length,
      },
      { status: 502 },
    );
  }

  db.prepare(
    'INSERT INTO programs (id, athlete_id, program_json, current_week, current_block, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    uuid(),
    session.id,
    JSON.stringify(program),
    1,
    program.currentBlock ?? program.weeks[0]?.blockName ?? 'Hypertrophy',
    Date.now(),
  );

  return NextResponse.json({ ok: true });
}
