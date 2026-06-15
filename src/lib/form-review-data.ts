// Coach-facing form reviews. A coached athlete shares one of their existing AI
// form checks with their coach; the coach leaves human feedback (optionally AI-
// drafted). Reuses the form_checks rows the athlete pipeline already produced.
import { execute, query, queryOne, uuid } from './db';

export interface SharedFormCheck {
  formCheckId: string;
  athleteId: string;
  athleteName: string | null;
  lift: string;
  loadKg: number | null;
  estimatedRpe: number | null;
  rpeConfidence: string | null;
  userContext: string | null;
  aiAnalysis: string | null; // JSON string from the athlete-side analysis
  cvJson: string | null;
  createdAt: number;
  feedback: string | null;
  feedbackAt: number | null;
}

// Athlete shares (or unshares) one of their own form checks with their coach.
export async function setFormCheckShared(
  athleteId: string,
  formCheckId: string,
  shared: boolean,
): Promise<boolean> {
  const owns = await queryOne(
    'SELECT 1 AS one FROM form_checks WHERE id = ? AND athlete_id = ?',
    [formCheckId, athleteId],
  );
  if (!owns) return false;
  await execute('UPDATE form_checks SET shared_with_coach = ? WHERE id = ?', [shared, formCheckId]);
  return true;
}

// All form checks shared by the coach's active roster, newest first, with any
// existing coach feedback joined.
export async function listSharedFormChecksForCoach(coachId: string): Promise<SharedFormCheck[]> {
  const rows = await query<{
    id: string;
    athlete_id: string;
    athlete_name: string | null;
    lift_type: string;
    load_kg: number | null;
    estimated_rpe: number | null;
    rpe_confidence: string | null;
    user_context: string | null;
    ai_analysis: string | null;
    cv_json: string | null;
    created_at: number;
    feedback: string | null;
    feedback_at: number | null;
  }>(
    `SELECT fc.id, fc.athlete_id, a.name AS athlete_name, fc.lift_type, fc.load_kg,
            fc.estimated_rpe, fc.rpe_confidence, fc.user_context, fc.ai_analysis, fc.cv_json,
            fc.created_at, ff.feedback, ff.created_at AS feedback_at
       FROM form_checks fc
       JOIN coach_athletes ca ON ca.athlete_id = fc.athlete_id AND ca.coach_id = ? AND ca.status = 'active'
       JOIN athletes a ON a.id = fc.athlete_id
       LEFT JOIN coach_form_feedback ff ON ff.form_check_id = fc.id
      WHERE fc.shared_with_coach = true
      ORDER BY fc.created_at DESC
      LIMIT 60`,
    [coachId],
  );
  return rows.map((r) => ({
    formCheckId: r.id,
    athleteId: r.athlete_id,
    athleteName: r.athlete_name,
    lift: r.lift_type,
    loadKg: r.load_kg == null ? null : Number(r.load_kg),
    estimatedRpe: r.estimated_rpe == null ? null : Number(r.estimated_rpe),
    rpeConfidence: r.rpe_confidence,
    userContext: r.user_context,
    aiAnalysis: r.ai_analysis,
    cvJson: r.cv_json,
    createdAt: r.created_at,
    feedback: r.feedback,
    feedbackAt: r.feedback_at,
  }));
}

// Fetch one shared form check IF it belongs to this coach's roster (ownership).
export async function getSharedFormCheckForCoach(
  coachId: string,
  formCheckId: string,
): Promise<SharedFormCheck | null> {
  const all = await query<{
    id: string;
    athlete_id: string;
    athlete_name: string | null;
    lift_type: string;
    load_kg: number | null;
    estimated_rpe: number | null;
    rpe_confidence: string | null;
    user_context: string | null;
    ai_analysis: string | null;
    cv_json: string | null;
    created_at: number;
  }>(
    `SELECT fc.id, fc.athlete_id, a.name AS athlete_name, fc.lift_type, fc.load_kg,
            fc.estimated_rpe, fc.rpe_confidence, fc.user_context, fc.ai_analysis, fc.cv_json, fc.created_at
       FROM form_checks fc
       JOIN coach_athletes ca ON ca.athlete_id = fc.athlete_id AND ca.coach_id = ? AND ca.status = 'active'
       JOIN athletes a ON a.id = fc.athlete_id
      WHERE fc.id = ? AND fc.shared_with_coach = true`,
    [coachId, formCheckId],
  );
  const r = all[0];
  if (!r) return null;
  return {
    formCheckId: r.id,
    athleteId: r.athlete_id,
    athleteName: r.athlete_name,
    lift: r.lift_type,
    loadKg: r.load_kg == null ? null : Number(r.load_kg),
    estimatedRpe: r.estimated_rpe == null ? null : Number(r.estimated_rpe),
    rpeConfidence: r.rpe_confidence,
    userContext: r.user_context,
    aiAnalysis: r.ai_analysis,
    cvJson: r.cv_json,
    createdAt: r.created_at,
    feedback: null,
    feedbackAt: null,
  };
}

export async function saveCoachFormFeedback(
  formCheckId: string,
  coachId: string,
  athleteId: string,
  feedback: string,
): Promise<void> {
  await execute(
    `INSERT INTO coach_form_feedback (id, form_check_id, coach_id, athlete_id, feedback, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (form_check_id) DO UPDATE SET feedback = excluded.feedback, created_at = excluded.created_at`,
    [uuid(), formCheckId, coachId, athleteId, feedback, Date.now()],
  );
}

// Coach feedback keyed by form_check_id, for showing on the athlete's own page.
export async function feedbackForAthlete(athleteId: string): Promise<Record<string, { feedback: string; createdAt: number }>> {
  const rows = await query<{ form_check_id: string; feedback: string; created_at: number }>(
    'SELECT form_check_id, feedback, created_at FROM coach_form_feedback WHERE athlete_id = ?',
    [athleteId],
  );
  const map: Record<string, { feedback: string; createdAt: number }> = {};
  for (const r of rows) map[r.form_check_id] = { feedback: r.feedback, createdAt: r.created_at };
  return map;
}

// Which of an athlete's form checks are currently shared (for the share toggle).
export async function sharedFormCheckIds(athleteId: string): Promise<Set<string>> {
  const rows = await query<{ id: string }>(
    'SELECT id FROM form_checks WHERE athlete_id = ? AND shared_with_coach = true',
    [athleteId],
  );
  return new Set(rows.map((r) => r.id));
}
