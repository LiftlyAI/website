import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { isAiKeyError } from '@/lib/ai';
import type { AiMessage } from '@/lib/ai';
import { assertAiQuota, recordAiCall, QuotaError } from '@/lib/limits';
import { buildPlanEditPrompt } from '@/lib/prompts/nutrition';
import { generateValidatedPlan } from '@/lib/nutrition-generate';
import { macroTargets } from '@/lib/calculations';
import type { AthleteProfile, MealPlan } from '@/lib/types';

// Conversational editing: the athlete says "swap the chicken for beef" or "add a
// 3pm snack" and we rewrite the saved plan in place — no fiddly per-field forms.
const Body = z.object({ instruction: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await assertAiQuota('athlete', session.id);
  } catch (err) {
    if (err instanceof QuotaError) {
      return NextResponse.json(
        { error: 'You’ve reached your AI generation limit for this period. Upgrade for more.', quota: err.info },
        { status: 402 },
      );
    }
    throw err;
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: 'Tell the coach what to change.' }, { status: 400 });
  }
  const instruction = parsed.data.instruction.trim();

  const profileRow = await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  );
  if (!profileRow?.profile_json) {
    return NextResponse.json({ error: 'profile missing' }, { status: 400 });
  }
  const profile = JSON.parse(profileRow.profile_json) as AthleteProfile;
  const targets = macroTargets(profile);

  const planRow = await queryOne<{ id: string; plan_json: string }>(
    'SELECT id, plan_json FROM meal_plans WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    [session.id],
  );
  if (!planRow?.plan_json) {
    return NextResponse.json({ error: 'No meal plan to edit yet — generate one first.' }, { status: 400 });
  }
  const currentPlan = JSON.parse(planRow.plan_json) as MealPlan;

  const messages: AiMessage[] = [
    { role: 'user', content: buildPlanEditPrompt(profile, targets, currentPlan, instruction) },
  ];

  let plan;
  let violations;
  try {
    ({ plan, violations } = await generateValidatedPlan(profile, messages));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    return NextResponse.json({ error: msg }, { status: isAiKeyError(err) ? 400 : 502 });
  }

  if (!plan) {
    if (violations.length) {
      return NextResponse.json(
        {
          error:
            'That change would break your dietary restrictions/allergies. Try wording it differently.',
          violations,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'failed to apply change' }, { status: 500 });
  }

  // Update the existing plan in place — an edit revises the current plan rather
  // than stacking a new row each time the athlete tweaks it.
  await execute('UPDATE meal_plans SET plan_json = ? WHERE id = ?', [
    JSON.stringify(plan),
    planRow.id,
  ]);
  await recordAiCall('athlete', session.id, 'nutrition');

  return NextResponse.json({ ok: true, plan, id: planRow.id });
}
