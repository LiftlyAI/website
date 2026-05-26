import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { getAnthropic, COACH_MODEL, safeParseJson } from '@/lib/anthropic';
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

  const client = getAnthropic();
  const res = await client.messages.create({
    model: COACH_MODEL,
    max_tokens: 16000,
    temperature: 0.5,
    system: PROGRAM_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildProgramUserPrompt(profile) }],
  });
  const text = res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
  const program = safeParseJson<Program>(text);
  if (!program || !Array.isArray(program.weeks)) {
    return NextResponse.json({ error: 'failed to parse program' }, { status: 500 });
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
