import { Suspense } from 'react';
import { requireSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { feedbackForAthlete, sharedFormCheckIds } from '@/lib/form-review-data';
import { FormCheckClient } from './FormCheckClient';
import { FormCheckCoachPanel, type CoachPanelItem } from './FormCheckCoachPanel';
import type { FormCheckResult } from '@/lib/types';
import { safeJsonParse } from '@/lib/utils';

export default async function FormCheckPage() {
  const session = await requireSession();

  const rows = await query<{
    id: string;
    lift_type: string;
    video_path: string | null;
    frames_count: number;
    user_context: string;
    ai_analysis: string;
    estimated_rpe: number | null;
    rpe_confidence: string | null;
    load_kg: number | null;
    cv_json: string | null;
    created_at: number;
  }>(
    `SELECT id, lift_type, video_path, frames_count, user_context, ai_analysis,
              estimated_rpe, rpe_confidence, load_kg, cv_json, created_at
       FROM form_checks WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 50`,
    [session.id],
  );

  const formChecks: FormCheckResult[] = rows.map((r) => ({
    id: r.id,
    athleteId: session.id,
    liftType: r.lift_type as FormCheckResult['liftType'],
    videoPath: r.video_path,
    framesCount: r.frames_count,
    userContext: r.user_context,
    aiAnalysis: r.ai_analysis,
    estimatedRPE: r.estimated_rpe,
    rpeConfidence: (r.rpe_confidence as FormCheckResult['rpeConfidence']) ?? null,
    loadKg: r.load_kg,
    cv: r.cv_json ? safeJsonParse<FormCheckResult['cv']>(r.cv_json, null) : null,
    createdAt: r.created_at,
  }));

  // Coach panel: only when this athlete has a coach. Lets them share clips and
  // see the human feedback their coach left.
  const coachRow = await queryOne<{ name: string | null; profile_json: string | null }>(
    `SELECT c.name, c.profile_json FROM athletes a JOIN coaches c ON c.id = a.coached_by WHERE a.id = ?`,
    [session.id],
  );
  let coachPanelItems: CoachPanelItem[] = [];
  let coachName = '';
  if (coachRow) {
    const [shared, feedback] = await Promise.all([
      sharedFormCheckIds(session.id),
      feedbackForAthlete(session.id),
    ]);
    coachName = coachRow.name ?? 'your coach';
    coachPanelItems = formChecks.slice(0, 10).map((fc) => ({
      id: fc.id,
      lift: fc.liftType,
      createdAt: fc.createdAt,
      shared: shared.has(fc.id),
      feedback: feedback[fc.id]?.feedback ?? null,
    }));
  }

  return (
    <Suspense fallback={<div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-10 text-chalk-mute">Loading…</div>}>
      {coachRow && <FormCheckCoachPanel coachName={coachName} items={coachPanelItems} />}
      <FormCheckClient initialChecks={formChecks} />
    </Suspense>
  );
}
