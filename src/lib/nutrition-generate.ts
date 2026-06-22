// Shared generate→validate→retry pipeline for meal plans. Used by the three
// nutrition routes (generate from scratch, optimise an existing diet, edit an
// existing plan) so the deterministic allergen/restriction safety loop lives in
// exactly one place. The caller supplies the seed messages (built by the
// relevant prompt builder); everything downstream — JSON parsing, the safety
// scan, and the violation-feedback retry — is identical.

import { aiGenerate, safeParseJson } from './ai';
import type { AiMessage } from './ai';
import { NUTRITION_SYSTEM_PROMPT } from './prompts/nutrition';
import { planViolations, uniqueViolations, type Violation } from './nutrition-safety';
import type { AthleteProfile, MealPlan } from './types';

const MAX_ATTEMPTS = 2;

export interface ValidatedPlanResult {
  plan: MealPlan | null;
  /** Unique violations from the final attempt — non-empty only when plan is null
   *  because the model could not satisfy the hard constraints. */
  violations: Violation[];
}

/**
 * Generate a meal plan from the given seed messages and validate it against the
 * athlete's hard dietary constraints. A leaked forbidden food is never returned —
 * the specific leaks are fed back and the plan is regenerated (up to MAX_ATTEMPTS).
 *
 * `seedMessages` mutate locally (assistant + retry turns are appended), so pass a
 * fresh array. Throws on AI/transport errors (callers map these to 4xx/5xx).
 */
export async function generateValidatedPlan(
  profile: AthleteProfile,
  seedMessages: AiMessage[],
): Promise<ValidatedPlanResult> {
  const messages = [...seedMessages];
  let lastViolations: Violation[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const text = await aiGenerate({
      system: NUTRITION_SYSTEM_PROMPT,
      messages,
      maxTokens: 3000,
      temperature: 0.6,
      json: true,
    });

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
      return { plan: candidate, violations: [] };
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

  return { plan: null, violations: lastViolations };
}
