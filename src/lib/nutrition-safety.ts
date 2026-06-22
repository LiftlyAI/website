// Deterministic post-generation safety net for meal plans. The LLM is asked to
// respect allergies and dietary restrictions, but it must NOT be the only thing
// standing between a user and a food they can't eat. Every generated plan is
// scanned here; any hit is a hard violation the route rejects + regenerates,
// never displays. These are *hard* constraints, so we deliberately over-flag
// (reject + retry) rather than risk a forbidden food slipping through.

import type { AthleteProfile, DietaryRestriction, MealPlan } from './types';

export interface Violation {
  term: string; // the forbidden word that matched
  food: string; // the offending food string
  meal: string; // which meal (or Pre/Post-workout) it appeared in
  reason: string; // restriction key or "allergy"
}

// Whole-word lists. Matched case-insensitively with optional trailing s/es so a
// singular entry covers its plural ("egg" → "eggs").
const MEAT = [
  'beef', 'steak', 'chicken', 'turkey', 'pork', 'bacon', 'ham', 'lamb', 'veal',
  'duck', 'sausage', 'prosciutto', 'salami', 'pepperoni', 'venison', 'bison',
  'meatball',
];
const FISH = [
  'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'sardine', 'anchovy',
  'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop',
  'squid', 'octopus', 'seafood',
];
const DAIRY = [
  'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'whey', 'casein',
  'ghee', 'custard',
];
const ANIMAL_OTHER = ['egg', 'honey', 'gelatin', 'gelatine'];
const GLUTEN = [
  'wheat', 'bread', 'pasta', 'barley', 'rye', 'couscous', 'flour', 'tortilla',
  'bagel', 'cracker', 'noodle', 'seitan', 'breadcrumb', 'cereal',
];

// Phrases that contain a forbidden word but are actually compliant. Neutralised
// out of the text before scanning, per restriction.
const PLANT_SAFE = [
  'soy milk', 'soymilk', 'almond milk', 'oat milk', 'coconut milk', 'rice milk',
  'pea milk', 'cashew milk', 'hemp milk', 'plant milk', 'plant-based milk',
  'peanut butter', 'almond butter', 'cashew butter', 'sunflower butter',
  'seed butter', 'nut butter', 'coconut butter', 'cocoa butter', 'vegan butter',
  'plant butter', 'vegan cheese', 'vegan cream', 'coconut cream', 'cashew cream',
  'vegan yogurt', 'vegan yoghurt', 'nutritional yeast',
];
const GF_SAFE = [
  'gluten-free', 'gluten free', 'almond flour', 'coconut flour', 'rice flour',
  'chickpea flour', 'corn flour', 'oat flour', 'tapioca flour', 'cassava flour',
  'rice noodle', 'rice pasta', 'rice cake',
];

interface DietRule {
  terms: string[];
  safe: string[];
}

const DIET_RULES: Record<Exclude<DietaryRestriction, 'none'>, DietRule> = {
  vegetarian: { terms: [...MEAT, ...FISH], safe: [] },
  vegan: { terms: [...MEAT, ...FISH, ...DAIRY, ...ANIMAL_OTHER], safe: PLANT_SAFE },
  lactose_free: { terms: DAIRY, safe: PLANT_SAFE },
  gluten_free: { terms: GLUTEN, safe: GF_SAFE },
};

// Free-text we treat as "no allergies declared".
const ALLERGY_FILLER = new Set(['none', 'na', 'n/a', 'no', 'nil', 'nothing', 'no allergies']);

function parseAllergies(raw?: string): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .toLowerCase()
        .split(/[,;\n/]| and /)
        .map((s) => s.trim().replace(/[.;]+$/, ''))
        .filter((s) => s.length > 1 && !ALLERGY_FILLER.has(s)),
    ),
  );
}

function neutralize(text: string, safe: string[]): string {
  let t = text;
  for (const p of safe) t = t.split(p).join(' ');
  return t;
}

function matchWord(haystack: string, term: string): boolean {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${esc}(?:es|s)?\\b`).test(haystack);
}

function* itemTexts(plan: MealPlan): Generator<{ text: string; meal: string }> {
  for (const m of plan.meals ?? []) {
    for (const it of m.items ?? []) {
      yield { text: `${it.quantity ?? ''} ${it.food}`.trim(), meal: m.name };
    }
  }
  if (plan.preWorkout) yield { text: plan.preWorkout, meal: 'Pre-workout' };
  if (plan.postWorkout) yield { text: plan.postWorkout, meal: 'Post-workout' };
  // The buy/swap list can name foods too — a "swap for chicken" tip must not slip
  // past for a vegetarian just because it lives outside the meals array.
  for (const c of plan.changes ?? []) {
    if (c) yield { text: c, meal: 'Changes' };
  }
}

/** Scan a generated plan against the athlete's hard constraints. Empty array
 *  means it passed. Cheap no-op when the athlete has no restrictions/allergies. */
export function planViolations(plan: MealPlan, profile: AthleteProfile): Violation[] {
  const restrictions = (profile.dietaryRestrictions ?? []).filter(
    (r): r is Exclude<DietaryRestriction, 'none'> => r !== 'none',
  );
  const allergyTerms = parseAllergies(profile.allergies);
  if (restrictions.length === 0 && allergyTerms.length === 0) return [];

  const out: Violation[] = [];
  for (const { text, meal } of itemTexts(plan)) {
    const lower = ` ${text.toLowerCase()} `;
    for (const r of restrictions) {
      const rule = DIET_RULES[r];
      const norm = neutralize(lower, rule.safe);
      for (const term of rule.terms) {
        if (matchWord(norm, term)) out.push({ term, food: text, meal, reason: r });
      }
    }
    for (const term of allergyTerms) {
      if (matchWord(lower, term)) out.push({ term, food: text, meal, reason: 'allergy' });
    }
  }
  return out;
}

/** De-dupe by term+food so the retry/error message stays short. */
export function uniqueViolations(v: Violation[]): Violation[] {
  const seen = new Set<string>();
  const out: Violation[] = [];
  for (const x of v) {
    const k = `${x.term}|${x.food}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}
