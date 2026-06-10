import { createSupabaseServerClient } from './supabase/server';
import { getDb } from './db';

export interface SessionAthlete {
  id: string;
  email: string;
  name: string | null;
  hasProfile: boolean;
}

export async function getSession(): Promise<SessionAthlete | null> {
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
