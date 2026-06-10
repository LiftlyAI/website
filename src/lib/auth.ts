import { createSupabaseServerClient } from './supabase/server';
import { getDb, uuid } from './db';

export interface SessionAthlete {
  id: string;
  email: string;
  name: string | null;
  hasProfile: boolean;
}

export async function getSession(): Promise<SessionAthlete | null> {
  // No Supabase configured → treat as logged out rather than throwing, so the
  // landing page and non-lifter surfaces (coach console) still render.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = getDb();
  const row = db
    .prepare('SELECT id, email, name, profile_json FROM athletes WHERE id = ?')
    .get(user.id) as
    | { id: string; email: string; name: string | null; profile_json: string | null }
    | undefined;

  if (!row) {
    const email = user.email!.toLowerCase().trim();
    // A coach may have pre-created this athlete by email (roster invite)
    // before their first Supabase sign-in — adopt that row, with its program
    // and coach link intact, instead of forking a second account keyed on the
    // Supabase id. (The email UNIQUE constraint would make the insert below
    // silently no-op and strand them otherwise.)
    const byEmail = db
      .prepare('SELECT id, email, name, profile_json FROM athletes WHERE email = ?')
      .get(email) as
      | { id: string; email: string; name: string | null; profile_json: string | null }
      | undefined;
    if (byEmail) {
      return {
        id: byEmail.id,
        email: byEmail.email,
        name: byEmail.name,
        hasProfile: !!byEmail.profile_json,
      };
    }
    // INSERT OR IGNORE guards against a race on simultaneous first requests
    db.prepare('INSERT OR IGNORE INTO athletes (id, email, name, created_at) VALUES (?, ?, ?, ?)')
      .run(user.id, email, null, Date.now());
    return { id: user.id, email, name: null, hasProfile: false };
  }

  return { id: row.id, email: row.email, name: row.name, hasProfile: !!row.profile_json };
}

export async function requireSession(): Promise<SessionAthlete> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}

// Get-or-create by email, for flows where the athlete hasn't signed in yet
// (coach roster invites). When they later sign in via Supabase, getSession
// adopts this row by email match.
export function getOrCreateAthleteByEmail(email: string, name?: string): SessionAthlete {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const existing = db
    .prepare('SELECT id, email, name, profile_json FROM athletes WHERE email = ?')
    .get(normalized) as
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
  db.prepare('INSERT INTO athletes (id, email, name, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    normalized,
    name ?? null,
    Date.now(),
  );
  return { id, email: normalized, name: name ?? null, hasProfile: false };
}
