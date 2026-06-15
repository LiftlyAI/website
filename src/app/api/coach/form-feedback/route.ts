import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCoach } from '@/lib/coach-auth';
import {
  getSharedFormCheckForCoach,
  saveCoachFormFeedback,
} from '@/lib/form-review-data';
import { aiGenerate, isAiKeyError } from '@/lib/ai';

const Body = z.object({
  formCheckId: z.string().min(1),
  // draft: ask AI for a suggested feedback note (returned, not saved).
  draft: z.boolean().optional(),
  // feedback: save this text as the coach's review of the clip.
  feedback: z.string().max(4000).optional(),
});

const DRAFT_SYSTEM = `You are a head powerlifting coach writing a short, direct form-review note TO YOUR ATHLETE about a video they sent. Use the measured analysis provided. 2-4 sentences, encouraging but specific: one thing working, the top cue to fix, and what to do next session. Plain text, no preamble, speak directly to the athlete.`;

export async function POST(req: NextRequest) {
  let coach;
  try {
    coach = await requireCoach();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  // Ownership + shared check live in getSharedFormCheckForCoach.
  const fc = await getSharedFormCheckForCoach(coach.id, parsed.data.formCheckId);
  if (!fc) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (parsed.data.draft) {
    const user = JSON.stringify({
      lift: fc.lift,
      loadKg: fc.loadKg,
      estimatedRpe: fc.estimatedRpe,
      athleteNote: fc.userContext,
      analysis: fc.aiAnalysis ? JSON.parse(fc.aiAnalysis) : null,
    });
    let text = '';
    try {
      text = await aiGenerate({
        system: DRAFT_SYSTEM,
        messages: [{ role: 'user', content: user }],
        maxTokens: 400,
        temperature: 0.6,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI call failed';
      return NextResponse.json({ error: msg }, { status: isAiKeyError(err) ? 400 : 502 });
    }
    return NextResponse.json({ ok: true, draft: text.trim() });
  }

  if (!parsed.data.feedback?.trim()) {
    return NextResponse.json({ error: 'feedback required' }, { status: 400 });
  }
  await saveCoachFormFeedback(fc.formCheckId, coach.id, fc.athleteId, parsed.data.feedback.trim());
  return NextResponse.json({ ok: true });
}
