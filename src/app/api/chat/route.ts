import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { getAnthropic, COACH_MODEL } from '@/lib/anthropic';
import { buildChatSystemPrompt } from '@/lib/prompts/chat';
import type { AthleteProfile, FormCheckResult, Program } from '@/lib/types';

const Body = z.object({
  message: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const data = await req.json().catch(() => null);
  const parsed = Body.safeParse(data);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const db = getDb();

  const profileRow = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string } | undefined;
  const profile = profileRow?.profile_json
    ? (JSON.parse(profileRow.profile_json) as AthleteProfile)
    : null;

  const programRow = db
    .prepare(
      'SELECT program_json, current_week FROM programs WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(session.id) as { program_json: string; current_week: number } | undefined;
  const program = programRow ? (JSON.parse(programRow.program_json) as Program) : null;
  const currentWeek =
    program && programRow
      ? program.weeks.find((w) => w.weekNumber === programRow.current_week) ?? program.weeks[0]
      : null;

  const fcRows = db
    .prepare(
      'SELECT id, lift_type, ai_analysis, estimated_rpe, user_context, created_at FROM form_checks WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 3',
    )
    .all(session.id) as {
    id: string;
    lift_type: string;
    ai_analysis: string;
    estimated_rpe: number | null;
    user_context: string;
    created_at: number;
  }[];
  const recentFormChecks: FormCheckResult[] = fcRows.map((r) => ({
    id: r.id,
    athleteId: session.id,
    liftType: r.lift_type as FormCheckResult['liftType'],
    videoPath: null,
    framesCount: 0,
    userContext: r.user_context,
    aiAnalysis: r.ai_analysis,
    estimatedRPE: r.estimated_rpe,
    rpeConfidence: null,
    loadKg: null,
    cv: null,
    createdAt: r.created_at,
  }));

  // History (last 20)
  const histRows = db
    .prepare(
      'SELECT role, content FROM chat_messages WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 20',
    )
    .all(session.id) as { role: 'user' | 'assistant'; content: string }[];
  const history = histRows
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));

  // Save user message now
  db.prepare(
    'INSERT INTO chat_messages (id, athlete_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(uuid(), session.id, 'user', parsed.data.message, Date.now());

  const system = buildChatSystemPrompt({
    profile,
    program,
    currentWeek,
    recentFormChecks,
  });

  const client = getAnthropic();
  const stream = client.messages.stream({
    model: COACH_MODEL,
    max_tokens: 1500,
    temperature: 0.7,
    system,
    messages: [...history, { role: 'user', content: parsed.data.message }],
  });

  const encoder = new TextEncoder();
  let acc = '';
  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            acc += ev.delta.text;
            controller.enqueue(encoder.encode(ev.delta.text));
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'stream error';
        controller.enqueue(encoder.encode(`\n\n⚠ ${msg}`));
      } finally {
        // Save assistant message
        if (acc.trim()) {
          db.prepare(
            'INSERT INTO chat_messages (id, athlete_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
          ).run(uuid(), session.id, 'assistant', acc, Date.now());
        }
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
