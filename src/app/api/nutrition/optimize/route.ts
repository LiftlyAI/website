import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { execute, queryOne, uuid } from '@/lib/db';
import { isAiKeyError } from '@/lib/ai';
import type { AiMessage } from '@/lib/ai';
import { assertAiQuota, recordAiCall, QuotaError } from '@/lib/limits';
import { buildDietOptimizePrompt } from '@/lib/prompts/nutrition';
import { generateValidatedPlan } from '@/lib/nutrition-generate';
import { macroTargets } from '@/lib/calculations';
import type { AthleteProfile } from '@/lib/types';

// "Optimise my diet": the athlete describes what they already eat and we
// restructure THAT into a macro-hitting plan + a concrete buy/swap list, rather
// than inventing one from scratch. Shares the generate→validate→retry pipeline.
const Body = z.object({
  currentDiet: z.string().min(1).max(1500),
  steer: z.string().max(500).optional(),
});

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
    return NextResponse.json({ error: 'Tell us what you currently eat first.' }, { status: 400 });
  }
  const currentDiet = parsed.data.currentDiet.trim();
  const steer = parsed.data.steer?.trim() || null;

  const row = await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  );
  if (!row?.profile_json) {
    return NextResponse.json({ error: 'profile missing' }, { status: 400 });
  }
  const profile = JSON.parse(row.profile_json) as AthleteProfile;
  const targets = macroTargets(profile);

  const messages: AiMessage[] = [
    { role: 'user', content: buildDietOptimizePrompt(profile, targets, currentDiet, steer ?? undefined) },
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
            'Could not restructure your diet within your dietary restrictions/allergies. ' +
            'Try simplifying them or editing what you eat.',
          violations,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'failed to parse meal plan' }, { status: 500 });
  }

  // Persist what they eat so the optimise box comes pre-filled next time.
  if (profile.currentDiet !== currentDiet) {
    profile.currentDiet = currentDiet;
    await execute('UPDATE athletes SET profile_json = ? WHERE id = ?', [
      JSON.stringify(profile),
      session.id,
    ]);
  }

  const id = uuid();
  const createdAt = Date.now();
  await execute(
    'INSERT INTO meal_plans (id, athlete_id, plan_json, targets_json, steer, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, session.id, JSON.stringify(plan), JSON.stringify(targets), steer, createdAt],
  );
  await recordAiCall('athlete', session.id, 'nutrition');

  return NextResponse.json({ ok: true, plan, id, createdAt, steer });
}
