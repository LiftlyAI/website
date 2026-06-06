import type { AthleteProfile, MacroTargets } from '../types';

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
- Respect dietary restrictions absolutely

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
  "notes": ["short evidence-based tip", "short tip"]
}

Output ONLY the JSON. No markdown. Meal macro totals must sum within ±5% of dailyTotals.`;

export function buildNutritionUserPrompt(profile: AthleteProfile, targets: MacroTargets): string {
  const isVeganOrVeg = profile.dietaryRestrictions.some(r => r === 'vegan' || r === 'vegetarian');
  const isVegan = profile.dietaryRestrictions.includes('vegan');

  const restrictionNote = isVegan
    ? `Athlete is vegan. Use pea/rice protein blends, tofu, tempeh, seitan, legumes, soy milk. Bump per-meal protein 20% higher to compensate for lower leucine density. Suggest algae-based omega-3.`
    : isVeganOrVeg
    ? `Athlete is vegetarian. Dairy and eggs are fine; no meat or fish. Use whey/casein, eggs, Greek yogurt, cottage cheese, legumes, tofu.`
    : '';

  const phaseContext =
    profile.phaseGoal === 'cutting'
      ? `Fat-loss phase. Protein is high (${targets.proteinPerKg.toFixed(1)} g/kg) to preserve muscle. Keep carbs as high as the deficit allows and cluster them around training. Trim fat to no lower than 15% of calories.`
      : profile.phaseGoal === 'gaining'
      ? `Lean-gain phase. Carbs should be generous to fuel training and fill glycogen. Protein at ${targets.proteinPerKg.toFixed(1)} g/kg is sufficient — don't over-allocate protein at the expense of carbs.`
      : `Maintenance/recomp phase. Protein at ${targets.proteinPerKg.toFixed(1)} g/kg. Carbs around training; moderate fat.`;

  const bwKg = (profile.unit === 'kg' ? profile.bodyweight : profile.bodyweight / 2.2046).toFixed(1);

  return `Generate a training-day meal plan for this athlete.

ATHLETE:
- Sex: ${profile.sex}, Age: ${profile.age}
- Bodyweight: ${profile.bodyweight} ${profile.unit} (${bwKg} kg)
- Experience: ${profile.experience}
- Phase: ${profile.phaseGoal}
- Training days/week: ${profile.trainingDaysPerWeek}
- Meals preferred: ${profile.mealsPerDay}
- Dietary restrictions: ${profile.dietaryRestrictions.join(', ') || 'none'}

DAILY TARGETS:
- Calories: ${targets.calories} kcal (TDEE ${targets.tdee} + ${targets.phaseAdjustment >= 0 ? '+' : ''}${targets.phaseAdjustment})
- Protein: ${targets.protein_g}g (${targets.proteinPerKg.toFixed(1)} g/kg) — ~${targets.perMealProteinG}g per meal
- Carbs: ${targets.carbs_g}g (${targets.carbsPerKg.toFixed(1)} g/kg)
- Fat: ${targets.fat_g}g

PHASE CONTEXT:
${phaseContext}
${restrictionNote ? `\nDIETARY NOTES:\n${restrictionNote}` : ''}
Protein must be distributed across all ${profile.mealsPerDay} meals (~${targets.perMealProteinG}g each). Include a casein-rich pre-sleep option as the last meal. Place the majority of carbs in the pre- and post-training meals. The sum of meal macros must land within ±5% of the daily targets.`;
}
