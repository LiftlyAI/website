import { Suspense } from 'react';
import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { FormCheckClient } from './FormCheckClient';
import type { FormCheckResult } from '@/lib/types';

export default async function FormCheckPage() {
  const session = await requireSession();
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT id, lift_type, video_path, frames_count, user_context, ai_analysis,
              estimated_rpe, rpe_confidence, load_kg, cv_json, created_at
       FROM form_checks WHERE athlete_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
    .all(session.id) as {
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
  }[];

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
    cv: r.cv_json ? (JSON.parse(r.cv_json) as FormCheckResult['cv']) : null,
    createdAt: r.created_at,
  }));

  return (
    <Suspense fallback={<div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-10 text-chalk-mute">Loading…</div>}>
      <FormCheckClient initialChecks={formChecks} />
    </Suspense>
  );
}
