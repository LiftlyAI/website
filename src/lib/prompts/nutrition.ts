import type { AthleteProfile, DietaryRestriction, MacroTargets, MealPlan } from '../types';

export const NUTRITION_SYSTEM_PROMPT = `You are a sports nutritionist specializing in strength athletes, working from ISSN position stands, Morton et al. 2018 meta-analysis, and Helms/Aragon/Fitschen guidelines. You write meal plans that are:

PROTEIN DISTRIBUTION (non-negotiable):
- Spread protein every 3–4 hours across the day's meals — never backloaded all at dinner
- Each meal should hit ~0.4 g/kg body weight (or 25–40 g per sitting) to clear the leucine threshold and maximise MPS
- Pre-sleep: include a casein-rich source (cottage cheese, Greek yogurt, casein powder) as the last protein hit of the day — supports overnight recovery
- Plant-based athletes: bump per-meal protein 20–25% higher (lower leucine density) and combine sources (pea+rice, or soy)

CARBOHYDRATE TIMING:
- Place the largest carb servings around training (pre- and post-workout meals)
- Pre-training meal: 1–4 g/kg carbs, 1–3 hours before; moderate protein, low fat
- Post-training: fast carbs + 30–50 g protein within 1–2 hours
- Rest-day carbs should be noticeably lower than training-day carbs

FAT FLOOR:
- Never let fat drop below ~15% of total calories — hormonal consequences
- Emphasise whole-food fats: olive oil, nuts, avocado, eggs, fatty fish

PRACTICAL FOOD SELECTION:
- Use real, grocery-store foods with concrete quantities (grams or household measures)
- No exotic supplements or ingredients not in a normal kitchen

HARD CONSTRAINTS (absolute — never violate):
- Allergies and dietary restrictions are non-negotiable. Never include a forbidden food, or any dish or ingredient that contains it. Examples: no whey/casein/milk/cheese/butter/cream for a dairy-free or vegan athlete; no bread/pasta/wheat/regular flour for gluten-free; no meat or fish for vegetarian; additionally no dairy, egg, or honey for vegan. If you are unsure whether an ingredient is compatible, pick a different ingredient.

PERSONALIZATION (honour when compatible with the macros AND the hard constraints):
- Lean toward the athlete's stated tastes, cuisines, and preferred foods; avoid foods they say they dislike.
- If the athlete lists ingredients they already have on hand, build the meals around those first.
- Respect any stated prep-time, budget, or cooking-skill limits. Hard constraints and macro targets always take priority over preferences.

You output a single JSON object with this exact structure:

{
  "dailyTotals": { "calories": ..., "protein_g": ..., "carbs_g": ..., "fat_g": ... },
  "meals": [
    {
      "name": "Breakfast",
      "timing": "7:00 AM",
      "items": [
        { "food": "...", "quantity": "...", "calories": ... }
      ],
      "protein_g": ...,
      "carbs_g": ...,
      "fat_g": ...,
      "calories": ...
    }
  ],
  "preWorkout": "Concrete pre-workout meal (foods + quantities + timing, e.g. '90 min before: 1 cup oats + 1 scoop whey + banana').",
  "postWorkout": "Concrete post-workout meal (foods + quantities).",
  "notes": ["short evidence-based tip", "short tip"],
  "changes": ["optional — only when restructuring an existing diet or applying an edit"]
}

CHANGES FIELD:
- Include "changes" ONLY when you are restructuring the athlete's existing diet or applying a requested edit. Omit it (or use []) for a from-scratch plan.
- Each entry is one concrete, actionable instruction phrased as what to buy / swap / adjust vs. what they already do — e.g. "Buy 0% Greek yogurt instead of full-fat", "Add a 4th egg at breakfast", "Bump cooked rice from 150g to 250g". Keep the list short (3–8 items) and concrete; no vague advice.

Output ONLY the JSON. No markdown. Meal macro totals must sum within ±5% of dailyTotals.`;

const RESTRICTION_TEXT: Record<Exclude<DietaryRestriction, 'none'>, string> = {
  vegetarian: 'vegetarian (no meat or fish; dairy and eggs are fine)',
  vegan: 'vegan (no meat, fish, dairy, egg, or honey)',
  lactose_free: 'dairy/lactose-free (no milk, cheese, yogurt, butter, cream, whey, or casein)',
  gluten_free: 'gluten-free (no wheat, bread, pasta, barley, rye, or regular flour)',
};

// The athlete + targets + constraints block shared by all three prompt builders
// (generate, optimise, edit). Keeping it in one place means a change to how
// restrictions/allergies/preferences are surfaced applies everywhere at once.
function buildContextBlock(
  profile: AthleteProfile,
  targets: MacroTargets,
  steer?: string,
): string {
  const isVegan = profile.dietaryRestrictions.includes('vegan');
  const isVegetarian = profile.dietaryRestrictions.includes('vegetarian');

  const restrictionList = profile.dietaryRestrictions.filter((r) => r !== 'none');
  const restrictionLine = restrictionList.length
    ? restrictionList
        .map((r) => RESTRICTION_TEXT[r as Exclude<DietaryRestriction, 'none'>] ?? r)
        .join('; ')
    : 'none';

  const sourceNote = isVegan
    ? `Vegan sourcing: pea/rice protein blends, tofu, tempeh, seitan, legumes, soy/plant milk. Bump per-meal protein 20% higher to compensate for lower leucine density. Suggest algae-based omega-3.`
    : isVegetarian
    ? `Vegetarian sourcing: dairy and eggs are fine; no meat or fish. Use whey/casein, eggs, Greek yogurt, cottage cheese, legumes, tofu.`
    : '';

  const allergies = (profile.allergies ?? '').trim();
  const prefs = (profile.foodPreferences ?? '').trim();
  const steerClean = (steer ?? '').trim();

  const phaseContext =
    profile.phaseGoal === 'cutting'
      ? `Fat-loss phase. Protein is high (${targets.proteinPerKg.toFixed(1)} g/kg) to preserve muscle. Keep carbs as high as the deficit allows and cluster them around training. Trim fat to no lower than 15% of calories.`
      : profile.phaseGoal === 'gaining'
      ? `Lean-gain phase. Carbs should be generous to fuel training and fill glycogen. Protein at ${targets.proteinPerKg.toFixed(1)} g/kg is sufficient — don't over-allocate protein at the expense of carbs.`
      : `Maintenance/recomp phase. Protein at ${targets.proteinPerKg.toFixed(1)} g/kg. Carbs around training; moderate fat.`;

  const bwKg = (profile.unit === 'kg' ? profile.bodyweight : profile.bodyweight / 2.2046).toFixed(1);

  return `ATHLETE:
- Sex: ${profile.sex}, Age: ${profile.age}
- Bodyweight: ${profile.bodyweight} ${profile.unit} (${bwKg} kg)
- Experience: ${profile.experience}
- Phase: ${profile.phaseGoal}
- Training days/week: ${profile.trainingDaysPerWeek}
- Meals preferred: ${profile.mealsPerDay}

DAILY TARGETS:
- Calories: ${targets.calories} kcal (TDEE ${targets.tdee} + ${targets.phaseAdjustment >= 0 ? '+' : ''}${targets.phaseAdjustment})
- Protein: ${targets.protein_g}g (${targets.proteinPerKg.toFixed(1)} g/kg) — ~${targets.perMealProteinG}g per meal
- Carbs: ${targets.carbs_g}g (${targets.carbsPerKg.toFixed(1)} g/kg)
- Fat: ${targets.fat_g}g

PHASE CONTEXT:
${phaseContext}

DIETARY RESTRICTIONS (hard — never include): ${restrictionLine}${sourceNote ? `\n${sourceNote}` : ''}
${allergies ? `ALLERGIES (hard — never include these, nor anything containing them): ${allergies}` : 'ALLERGIES: none declared'}
${prefs ? `TASTE PREFERENCES (soft — honour when compatible with the macros): ${prefs}` : ''}
${steerClean ? `FOR THIS PLAN SPECIFICALLY (soft — honour when compatible with the macros): ${steerClean}` : ''}`;
}

export function buildNutritionUserPrompt(
  profile: AthleteProfile,
  targets: MacroTargets,
  steer?: string,
): string {
  return `Generate a training-day meal plan for this athlete.

${buildContextBlock(profile, targets, steer)}

Protein must be distributed across all ${profile.mealsPerDay} meals (~${targets.perMealProteinG}g each). Include a casein-rich pre-sleep option as the last meal (or a vegan equivalent if the athlete is vegan/dairy-free). Place the majority of carbs in the pre- and post-training meals. The sum of meal macros must land within ±5% of the daily targets. Hard constraints override every preference above.`;
}

// "Optimise my diet" — the athlete describes what they already eat; restructure
// THAT rather than inventing a plan from scratch. The whole point is minimal,
// non-intrusive change: keep their foods and habits, fix the portions and a few
// swaps, and tell them exactly what to buy.
export function buildDietOptimizePrompt(
  profile: AthleteProfile,
  targets: MacroTargets,
  currentDiet: string,
  steer?: string,
): string {
  return `The athlete already eats roughly this every day — restructure THIS diet to hit the targets below. Do NOT invent an unrelated plan.

WHAT THEY CURRENTLY EAT:
${currentDiet.trim()}

${buildContextBlock(profile, targets, steer)}

HOW TO RESTRUCTURE (minimal, non-intrusive):
- Keep the foods and meal structure they already use. Adjust QUANTITIES first to hit the macro targets.
- Prefer swapping to a better VERSION of a food they already buy (leaner mince, 0%/2% dairy, more egg whites, whole-grain vs white) over introducing new foods.
- Only add or remove a food when the math genuinely needs it (e.g. protein is far short). Keep additions cheap and ordinary.
- Distribute protein across all ${profile.mealsPerDay} meals (~${targets.perMealProteinG}g each) and a casein-rich pre-sleep option; cluster carbs around training. Sum of meal macros within ±5% of targets.
- Populate "changes" with the concrete shopping/swap list vs. what they wrote above (what to buy, what to swap, which portions to change). This is the most important output for the athlete.

Hard constraints (restrictions/allergies) override everything, including foods they currently eat — if a current food violates a hard constraint, replace it and note that in "changes".`;
}

// Conversational edit — apply a single natural-language instruction to an
// existing saved plan and return the FULL revised plan. Used by /api/nutrition/edit
// so the athlete can just say "swap the chicken for beef" instead of editing fields.
export function buildPlanEditPrompt(
  profile: AthleteProfile,
  targets: MacroTargets,
  currentPlan: MealPlan,
  instruction: string,
): string {
  return `Apply the athlete's requested change to their existing meal plan and return the FULL revised plan.

CURRENT PLAN (JSON):
${JSON.stringify(currentPlan, null, 2)}

REQUESTED CHANGE:
${instruction.trim()}

${buildContextBlock(profile, targets)}

RULES:
- Make the requested change and only the knock-on adjustments needed to keep the day balanced. Do not silently rewrite unrelated meals.
- Keep total macros within ±5% of the daily targets above; rebalance other meals if the change moves the totals.
- Keep protein distributed across meals and a casein-rich pre-sleep option; carbs clustered around training.
- Hard constraints (restrictions/allergies) override the instruction — if the request would introduce a forbidden food, pick the closest compliant alternative.
- Put a short summary of what you changed in "changes" (1–4 items).`;
}
