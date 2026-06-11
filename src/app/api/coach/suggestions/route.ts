import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoach, requireCoachOwns } from '@/lib/coach-auth';
import { execute } from '@/lib/db';
import {
  getSuggestion,
  loadCoachingData,
  replacePendingLoadSuggestions,
} from '@/lib/coach-data';
import { applyLoadSuggestion, generateLoadSuggestions } from '@/lib/suggestions';

// POST = run the AI first pass for one athlete: regenerate their pending queue.
const GenerateBody = z.object({ athleteId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => null);
  const parsed = GenerateBody.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  let coach;
  try {
    coach = await requireCoachOwns(parsed.data.athleteId);
  } catch (e) {
    const forbidden = e instanceof Error && e.message === 'FORBIDDEN';
    return NextResponse.json(
      { error: forbidden ? 'not your client' : 'unauthorized' },
      { status: forbidden ? 403 : 401 },
    );
  }

  const coaching = await loadCoachingData(parsed.data.athleteId);
  if (!coaching) {
    return NextResponse.json(
      { error: 'client has no profile or program yet' },
      { status: 400 },
    );
  }
  const payloads = generateLoadSuggestions({
    program: coaching.program,
    profile: coaching.profile,
    logs: coaching.logs,
    fromWeek: coaching.currentWeek,
    fromDay: null,
  });
  const created = await replacePendingLoadSuggestions(
    coach.id,
    parsed.data.athleteId,
    payloads,
    'autoregulation',
  );
  return NextResponse.json({ ok: true, created });
}

// PATCH = the human-in-the-loop verdict. Approve (optionally with an edited
// weight) applies the change to the athlete's program; reject just closes it.
const ActBody = z.object({
  id: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  weight: z.number().positive().optional(),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  let coach;
  try {
    coach = await requireCoach();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const data = await req.json().catch(() => null);
  const parsed = ActBody.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const suggestion = await getSuggestion(parsed.data.id);
  // 404 on both missing and not-owned: don't leak other coaches' queue ids.
  if (!suggestion || suggestion.coachId !== coach.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (suggestion.status !== 'pending') {
    return NextResponse.json({ error: 'already resolved' }, { status: 409 });
  }

  if (parsed.data.action === 'reject') {
    await execute(
      "UPDATE coach_suggestions SET status = 'rejected', coach_note = ?, resolved_at = ? WHERE id = ?",
      [parsed.data.note ?? null, Date.now(), suggestion.id],
    );
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  const finalWeight = parsed.data.weight ?? suggestion.payload.suggestedWeight;
  const coaching = await loadCoachingData(suggestion.athleteId);
  if (!coaching) {
    return NextResponse.json({ error: 'client program missing' }, { status: 409 });
  }
  const { program, applied } = applyLoadSuggestion(
    coaching.program,
    suggestion.payload,
    finalWeight,
  );
  if (!applied) {
    // The program changed under the suggestion — surface it, don't fake success.
    return NextResponse.json(
      { error: 'exercise no longer in program — regenerate suggestions' },
      { status: 409 },
    );
  }
  await execute('UPDATE programs SET program_json = ? WHERE id = ?', [
    JSON.stringify(program),
    coaching.programId,
  ]);
  await execute(
    "UPDATE coach_suggestions SET status = 'approved', edited_weight = ?, coach_note = ?, resolved_at = ? WHERE id = ?",
    [
      parsed.data.weight != null && parsed.data.weight !== suggestion.payload.suggestedWeight
        ? parsed.data.weight
        : null,
      parsed.data.note ?? null,
      Date.now(),
      suggestion.id,
    ],
  );
  return NextResponse.json({ ok: true, status: 'approved', appliedWeight: finalWeight });
}
