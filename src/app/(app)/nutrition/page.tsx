import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { macroTargets } from '@/lib/calculations';
import type { AthleteProfile, MacroTargets, MealPlan, SavedMealPlan } from '@/lib/types';
import { NutritionView } from './NutritionView';

export default async function NutritionPage() {
  const session = await requireSession();
  const db = getDb();
  const row = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string };
  const profile = JSON.parse(row.profile_json) as AthleteProfile;
  const targets = macroTargets(profile);

  const planRow = db
    .prepare(
      'SELECT id, plan_json, targets_json, steer, created_at FROM meal_plans WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(session.id) as
    | { id: string; plan_json: string; targets_json: string; steer: string | null; created_at: number }
    | undefined;

  let initialPlan: SavedMealPlan | null = null;
  let initialStale = false;
  if (planRow) {
    const savedTargets = JSON.parse(planRow.targets_json) as MacroTargets;
    initialPlan = {
      id: planRow.id,
      plan: JSON.parse(planRow.plan_json) as MealPlan,
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
