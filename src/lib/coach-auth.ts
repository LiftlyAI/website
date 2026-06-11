// Coach auth — mirrors auth.ts (email-based session cookie) but for the coach
// entity, under a SEPARATE cookie so a browser can hold both an athlete and a
// coach session. Every coach-initiated read/write on an athlete must go through
// requireCoachOwns — that is the tenant-isolation boundary.
import { cookies } from 'next/headers';
import { execute, queryOne, uuid } from './db';

const COOKIE_NAME = 'pl_coach_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

export interface SessionCoach {
  id: string;
  email: string;
  name: string | null;
}

export async function getOrCreateCoach(email: string, name?: string): Promise<SessionCoach> {
  const normalized = email.trim().toLowerCase();
  const existing = await queryOne<SessionCoach>(
    'SELECT id, email, name FROM coaches WHERE email = ?',
    [normalized],
  );
  if (existing) return existing;

  const id = uuid();
  await execute('INSERT INTO coaches (id, email, name, created_at) VALUES (?, ?, ?, ?)', [
    id,
    normalized,
    name ?? null,
    Date.now(),
  ]);
  return { id, email: normalized, name: name ?? null };
}

export async function setCoachSession(coachId: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, coachId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR,
    path: '/',
  });
}

export async function clearCoachSession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getCoachSession(): Promise<SessionCoach | null> {
  const c = await cookies();
  const coachId = c.get(COOKIE_NAME)?.value;
  if (!coachId) return null;

  const row = await queryOne<SessionCoach>('SELECT id, email, name FROM coaches WHERE id = ?', [
    coachId,
  ]);
  return row ?? null;
}

export async function requireCoach(): Promise<SessionCoach> {
  const s = await getCoachSession();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}

export async function coachOwnsAthlete(coachId: string, athleteId: string): Promise<boolean> {
  const row = await queryOne(
    "SELECT 1 AS one FROM coach_athletes WHERE coach_id = ? AND athlete_id = ? AND status = 'active'",
    [coachId, athleteId],
  );
  return !!row;
}

// The object-level authorization gate for every coach action on an athlete.
export async function requireCoachOwns(athleteId: string): Promise<SessionCoach> {
  const coach = await requireCoach();
  if (!(await coachOwnsAthlete(coach.id, athleteId))) throw new Error('FORBIDDEN');
  return coach;
}
