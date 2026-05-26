// MVP auth: email-based session cookie. Not magic-link or password — just enough
// to bind a browser to an athlete row. Replace with NextAuth Email provider later.
import { cookies } from 'next/headers';
import { getDb, uuid } from './db';

const COOKIE_NAME = 'pl_session';
const ONE_YEAR = 60 * 60 * 24 * 365;

export interface SessionAthlete {
  id: string;
  email: string;
  name: string | null;
  hasProfile: boolean;
}

export function getOrCreateAthlete(email: string, name?: string): SessionAthlete {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, email, name, profile_json FROM athletes WHERE email = ?')
    .get(email.trim().toLowerCase()) as
    | { id: string; email: string; name: string | null; profile_json: string | null }
    | undefined;

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      hasProfile: !!existing.profile_json,
    };
  }

  const id = uuid();
  db.prepare(
    'INSERT INTO athletes (id, email, name, created_at) VALUES (?, ?, ?, ?)',
  ).run(id, email.trim().toLowerCase(), name ?? null, Date.now());

  return { id, email: email.trim().toLowerCase(), name: name ?? null, hasProfile: false };
}

export async function setSession(athleteId: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, athleteId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR,
    path: '/',
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionAthlete | null> {
  const c = await cookies();
  const athleteId = c.get(COOKIE_NAME)?.value;
  if (!athleteId) return null;

  const db = getDb();
  const row = db
    .prepare('SELECT id, email, name, profile_json FROM athletes WHERE id = ?')
    .get(athleteId) as
    | { id: string; email: string; name: string | null; profile_json: string | null }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    hasProfile: !!row.profile_json,
  };
}

export async function requireSession(): Promise<SessionAthlete> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}
