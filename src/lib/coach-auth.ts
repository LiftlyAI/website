// Coach auth — mirrors auth.ts (email-based session cookie) but for the coach
// entity, under a SEPARATE cookie so a browser can hold both an athlete and a
// coach session. Every coach-initiated read/write on an athlete must go through
// requireCoachOwns — that is the tenant-isolation boundary.
import { cookies } from 'next/headers';
import type DatabaseT from 'better-sqlite3';
import { getDb, uuid } from './db';

const COOKIE_NAME = 'pl_coach_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

export interface SessionCoach {
  id: string;
  email: string;
  name: string | null;
}

export function getOrCreateCoach(email: string, name?: string): SessionCoach {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const existing = db
    .prepare('SELECT id, email, name FROM coaches WHERE email = ?')
    .get(normalized) as SessionCoach | undefined;
  if (existing) return existing;

  const id = uuid();
  db.prepare('INSERT INTO coaches (id, email, name, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    normalized,
    name ?? null,
    Date.now(),
  );
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

  const db = getDb();
  const row = db
    .prepare('SELECT id, email, name FROM coaches WHERE id = ?')
    .get(coachId) as SessionCoach | undefined;
  return row ?? null;
}

export async function requireCoach(): Promise<SessionCoach> {
  const s = await getCoachSession();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}

export function coachOwnsAthlete(
  db: DatabaseT.Database,
  coachId: string,
  athleteId: string,
): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM coach_athletes WHERE coach_id = ? AND athlete_id = ? AND status = 'active'",
    )
    .get(coachId, athleteId);
  return !!row;
}

// The object-level authorization gate for every coach action on an athlete.
export async function requireCoachOwns(athleteId: string): Promise<SessionCoach> {
  const coach = await requireCoach();
  if (!coachOwnsAthlete(getDb(), coach.id, athleteId)) throw new Error('FORBIDDEN');
  return coach;
}
