// Admin-console data assembly. Callers must pass requireAdmin() first — there is
// no per-row ownership here, admins act globally.
import { execute, query } from './db';
import type { CoachCredential, CoachReview } from './types';

export interface AdminCredentialItem extends CoachCredential {
  coachName: string | null;
  coachUsername: string | null;
}

export async function listCredentialQueue(): Promise<AdminCredentialItem[]> {
  const rows = await query<{
    id: string;
    coach_id: string;
    title: string;
    issuer: string | null;
    document_url: string | null;
    status: string;
    created_at: number;
    reviewed_at: number | null;
    coach_name: string | null;
    coach_username: string | null;
  }>(
    `SELECT cr.*, c.name AS coach_name, c.username AS coach_username
       FROM coach_credentials cr JOIN coaches c ON c.id = cr.coach_id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at`,
  );
  return rows.map((r) => ({
    id: r.id,
    coachId: r.coach_id,
    title: r.title,
    issuer: r.issuer,
    documentUrl: r.document_url,
    status: r.status as CoachCredential['status'],
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    coachName: r.coach_name,
    coachUsername: r.coach_username,
  }));
}

export async function setCredentialStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  await execute('UPDATE coach_credentials SET status = ?, reviewed_at = ? WHERE id = ?', [
    status,
    Date.now(),
    id,
  ]);
}

export interface AdminCoachRow {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  verified: boolean;
  banned: boolean;
  listed: boolean;
  pendingCredentials: number;
}

export async function listCoachesForAdmin(): Promise<AdminCoachRow[]> {
  const rows = await query<{
    id: string;
    name: string | null;
    username: string | null;
    email: string;
    verified: boolean;
    banned: boolean;
    listed: boolean;
    pending: number;
  }>(
    `SELECT c.id, c.name, c.username, c.email, c.verified, c.banned, c.listed,
            (SELECT COUNT(*) FROM coach_credentials cr
               WHERE cr.coach_id = c.id AND cr.status = 'pending') AS pending
       FROM coaches c
      WHERE c.username IS NOT NULL
      ORDER BY c.verified ASC, pending DESC, c.name`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    username: r.username,
    email: r.email,
    verified: !!r.verified,
    banned: !!r.banned,
    listed: !!r.listed,
    pendingCredentials: Number(r.pending),
  }));
}

export async function setCoachVerified(coachId: string, verified: boolean): Promise<void> {
  await execute('UPDATE coaches SET verified = ?, verified_at = ? WHERE id = ?', [
    verified,
    verified ? Date.now() : null,
    coachId,
  ]);
}

export async function setCoachBanned(coachId: string, banned: boolean): Promise<void> {
  await execute('UPDATE coaches SET banned = ? WHERE id = ?', [banned, coachId]);
}

export interface AdminReviewItem extends CoachReview {
  coachName: string | null;
  coachUsername: string | null;
  hidden: boolean;
}

export async function listReviewsForModeration(limit = 50): Promise<AdminReviewItem[]> {
  const rows = await query<{
    id: string;
    coach_id: string;
    athlete_id: string;
    athlete_name: string | null;
    rating: number;
    communication: number | null;
    programming: number | null;
    meet_prep: number | null;
    responsiveness: number | null;
    body: string | null;
    created_at: number;
    hidden: boolean;
    coach_name: string | null;
    coach_username: string | null;
  }>(
    `SELECT r.*, a.name AS athlete_name, c.name AS coach_name, c.username AS coach_username
       FROM coach_reviews r
       JOIN athletes a ON a.id = r.athlete_id
       JOIN coaches c ON c.id = r.coach_id
      ORDER BY r.created_at DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    coachId: r.coach_id,
    athleteId: r.athlete_id,
    athleteName: r.athlete_name,
    rating: r.rating,
    communication: r.communication,
    programming: r.programming,
    meetPrep: r.meet_prep,
    responsiveness: r.responsiveness,
    body: r.body,
    createdAt: r.created_at,
    hidden: !!r.hidden,
    coachName: r.coach_name,
    coachUsername: r.coach_username,
  }));
}

export async function setReviewHidden(id: string, hidden: boolean): Promise<void> {
  await execute('UPDATE coach_reviews SET hidden = ? WHERE id = ?', [hidden, id]);
}
