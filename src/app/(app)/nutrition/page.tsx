import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { macroTargets } from '@/lib/calculations';
import type { AthleteProfile } from '@/lib/types';
import { NutritionView } from './NutritionView';

export default async function NutritionPage() {
  const session = await requireSession();
  const db = getDb();
  const row = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string };
  const profile = JSON.parse(row.profile_json) as AthleteProfile;
  const targets = macroTargets(profile);
  return <NutritionView profile={profile} targets={targets} />;
}
