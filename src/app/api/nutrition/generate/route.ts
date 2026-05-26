import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getAnthropic, COACH_MODEL, safeParseJson } from '@/lib/anthropic';
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

  const client = getAnthropic();
  const res = await client.messages.create({
    model: COACH_MODEL,
    max_tokens: 2000,
    temperature: 0.6,
    system: NUTRITION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildNutritionUserPrompt(profile, targets) }],
  });
  const text = res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();
  const plan = safeParseJson<MealPlan>(text);
  if (!plan) {
    return NextResponse.json({ error: 'failed to parse meal plan' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, plan });
}
