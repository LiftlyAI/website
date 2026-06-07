import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb, uuid } from '@/lib/db';
import { aiGenerate, isAiKeyError, safeParseJson } from '@/lib/ai';
import type { AiMessage } from '@/lib/ai';
import { NUTRITION_SYSTEM_PROMPT, buildNutritionUserPrompt } from '@/lib/prompts/nutrition';
import { macroTargets } from '@/lib/calculations';
import { planViolations, uniqueViolations, type Violation } from '@/lib/nutrition-safety';
import type { AthleteProfile, MealPlan } from '@/lib/types';

const Body = z.object({ steer: z.string().max(500).optional() });

const MAX_ATTEMPTS = 2;

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw ?? {});
  const steer = parsed.success ? parsed.data.steer?.trim() || null : null;

  const db = getDb();
  const row = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string } | undefined;
  if (!row?.profile_json) {
    return NextResponse.json({ error: 'profile missing' }, { status: 400 });
  }
  const profile = JSON.parse(row.profile_json) as AthleteProfile;
  const targets = macroTargets(profile);

  const messages: AiMessage[] = [
    { role: 'user', content: buildNutritionUserPrompt(profile, targets, steer ?? undefined) },
  ];

  let plan: MealPlan | null = null;
  let lastViolations: Violation[] = [];

  // Generate, then run the deterministic allergen/restriction check. A leaked
  // forbidden food is never shown — we feed the specific leaks back and retry.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let text = '';
    try {
      text = await aiGenerate({
        system: NUTRITION_SYSTEM_PROMPT,
        messages,
        maxTokens: 3000,
        temperature: 0.6,
        json: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI call failed';
      return NextResponse.json({ error: msg }, { status: isAiKeyError(err) ? 400 : 502 });
    }

    const candidate = safeParseJson<MealPlan>(text);
    if (!candidate) {
      messages.push({ role: 'assistant', content: text });
      messages.push({
        role: 'user',
        content: 'That was not valid JSON. Return ONLY the meal plan JSON object in the exact schema.',
      });
      continue;
    }

    const violations = planViolations(candidate, profile);
    if (violations.length === 0) {
      plan = candidate;
      break;
    }

    lastViolations = uniqueViolations(violations);
    messages.push({ role: 'assistant', content: text });
    messages.push({
      role: 'user',
      content:
        `This plan violated the athlete's HARD dietary constraints. Remove or replace every item ` +
        `containing these forbidden foods, then regenerate the FULL plan keeping the same macro targets:\n` +
        lastViolations.map((v) => `- "${v.food}" contains forbidden "${v.term}"`).join('\n') +
        `\nReturn ONLY the corrected meal plan JSON.`,
    });
  }

  if (!plan) {
    if (lastViolations.length) {
      return NextResponse.json(
        {
          error:
            'Could not generate a plan that fully meets your dietary restrictions/allergies. ' +
            'Try simplifying them or generating again.',
          violations: lastViolations,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'failed to parse meal plan' }, { status: 500 });
  }

  const id = uuid();
  const createdAt = Date.now();
  db.prepare(
    'INSERT INTO meal_plans (id, athlete_id, plan_json, targets_json, steer, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, session.id, JSON.stringify(plan), JSON.stringify(targets), steer, createdAt);

  return NextResponse.json({ ok: true, plan, id, createdAt, steer });
}
