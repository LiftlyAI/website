import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { aiGenerate, isAiKeyError, safeParseJson } from '@/lib/ai';
import { NUTRITION_SYSTEM_PROMPT, buildNutritionUserPrompt } from '@/lib/prompts/nutrition';
import { macroTargets } from '@/lib/calculations';
import type { AthleteProfile, MealPlan } from '@/lib/types';

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
    return NextResponse.json({ error: 'profile missing' }, { status: 400 });
  }
  const profile = JSON.parse(row.profile_json) as AthleteProfile;
  const targets = macroTargets(profile);

  let text = '';
  try {
    text = await aiGenerate({
      system: NUTRITION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildNutritionUserPrompt(profile, targets) }],
      maxTokens: 3000,
      temperature: 0.6,
      json: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    return NextResponse.json({ error: msg }, { status: isAiKeyError(err) ? 400 : 502 });
  }
  const plan = safeParseJson<MealPlan>(text);
  if (!plan) {
    return NextResponse.json({ error: 'failed to parse meal plan' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, plan });
}
