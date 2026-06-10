import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { aiStream, isAiKeyError } from '@/lib/ai';
import { buildChatSystemPrompt, type ChatSessionSummary } from '@/lib/prompts/chat';
import { assessReadinessLog } from '@/lib/readiness';
import type {
  AthleteProfile,
  FormCheckResult,
  Program,
  SessionLogEntry,
} from '@/lib/types';

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

  // Recent sessions (last 5) — top set per lift + how it felt, so the coach can
  // talk about what the lifter actually did, not just the prescription.
  const sessRows = db
    .prepare(
      'SELECT date, exercises_json, bodyweight, notes FROM session_logs WHERE athlete_id = ? ORDER BY date DESC, created_at DESC LIMIT 5',
    )
    .all(session.id) as {
    date: string;
    exercises_json: string;
    bodyweight: number | null;
    notes: string | null;
  }[];
  const readinessByDate = new Map<string, string>();
  if (sessRows.length > 0) {
    const rRows = db
      .prepare(
        'SELECT id, athlete_id, date, sleep, energy, soreness, stress, pain, pain_note, note, created_at FROM readiness_logs WHERE athlete_id = ? ORDER BY date DESC LIMIT 10',
      )
      .all(session.id) as {
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
    }[];
    for (const r of rRows) {
      const a = assessReadinessLog({
        id: r.id,
        athleteId: r.athlete_id,
        date: r.date,
        sleep: r.sleep,
        energy: r.energy,
        soreness: r.soreness,
        stress: r.stress,
        pain: r.pain,
        painNote: r.pain_note,
        note: r.note,
        createdAt: r.created_at,
      });
      readinessByDate.set(r.date, a.rpeCap != null ? `${a.flag}, soft RPE cap ${a.rpeCap}` : a.flag);
    }
  }
  const recentSessions: ChatSessionSummary[] = sessRows.map((s) => {
    const exs = JSON.parse(s.exercises_json) as SessionLogEntry[];
    const topSets = exs
      .map((ex) => {
        const top = [...ex.sets]
          .filter((st) => st.weight && st.reps)
          .sort((a, b) => b.weight - a.weight)[0];
        return top
          ? { exercise: ex.exercise, weight: top.weight, reps: top.reps, rpe: top.actualRPE }
          : null;
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .slice(0, 5);
    return {
      date: s.date,
      topSets,
      bodyweight: s.bodyweight,
      notes: s.notes,
      readiness: readinessByDate.get(s.date) ?? null,
    };
  });

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
    recentSessions,
  });

  let stream: AsyncIterable<string>;
  try {
    stream = aiStream({
      system,
      messages: [
        ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: parsed.data.message },
      ],
      maxTokens: 1500,
      temperature: 0.7,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    return NextResponse.json({ error: msg }, { status: isAiKeyError(err) ? 400 : 502 });
  }

  const encoder = new TextEncoder();
  let acc = '';
  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          acc += chunk;
          controller.enqueue(encoder.encode(chunk));
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
