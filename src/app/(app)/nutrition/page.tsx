import { requireSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { macroTargets } from '@/lib/calculations';
import type { AthleteProfile, MacroTargets, MealPlan, SavedMealPlan } from '@/lib/types';
import { safeJsonParse } from '@/lib/utils';
import { NutritionView } from './NutritionView';

export default async function NutritionPage() {
  const session = await requireSession();
  const row = (await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  ))!;
  const profile = safeJsonParse<AthleteProfile>(row.profile_json, {} as AthleteProfile);
  const targets = macroTargets(profile);

  const planRow = await queryOne<{
    id: string;
    plan_json: string;
    targets_json: string;
    steer: string | null;
    created_at: number;
  }>(
    'SELECT id, plan_json, targets_json, steer, created_at FROM meal_plans WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    [session.id],
  );

  let initialPlan: SavedMealPlan | null = null;
  let initialStale = false;
  const savedPlan = planRow ? safeJsonParse<MealPlan | null>(planRow.plan_json, null) : null;
  if (planRow && savedPlan) {
    const savedTargets = safeJsonParse<MacroTargets>(planRow.targets_json, targets);
    initialPlan = {
      id: planRow.id,
      plan: savedPlan,
      targets: savedTargets,
      steer: planRow.steer,
      createdAt: planRow.created_at,
    };
    initialStale = targetsChanged(savedTargets, targets);
  }

  return (
    <NutritionView
      profile={profile}
      targets={targets}
      initialPlan={initialPlan}
      initialStale={initialStale}
    />
  );
}

// Macro numbers are the part users trust as "the math"; if they've shifted since
// a plan was saved (bodyweight/phase change), that saved plan is stale.
function targetsChanged(a: MacroTargets, b: MacroTargets): boolean {
  return (
    a.calories !== b.calories ||
    a.protein_g !== b.protein_g ||
    a.carbs_g !== b.carbs_g ||
    a.fat_g !== b.fat_g
  );
}
