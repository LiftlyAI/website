// Auth: Supabase Auth (email + password) for the session, Postgres for the
// athlete row. The Supabase user id IS the athletes.id, so once a user verifies
// their email we lazily provision their athlete row on first authenticated
// request. Login/signup happen client-side (see app/login/page.tsx); logout is
// app/api/auth/logout. There is no local file DB here — all access goes through
// the Postgres helpers in ./db (Vercel's filesystem is read-only).
import { createSupabaseServerClient } from './supabase/server';
import { execute, queryOne } from './db';

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

  const row = await queryOne<{
    id: string;
    email: string;
    name: string | null;
    profile_json: string | null;
  }>('SELECT id, email, name, profile_json FROM athletes WHERE id = ?', [user.id]);

  if (!row) {
    const email = (user.email ?? '').toLowerCase().trim();
    // ON CONFLICT DO NOTHING guards against a race on simultaneous first requests.
    await execute(
      'INSERT INTO athletes (id, email, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
      [user.id, email, null, Date.now()],
    );
    return { id: user.id, email, name: null, hasProfile: false };
  }

  return { id: row.id, email: row.email, name: row.name, hasProfile: !!row.profile_json };
}

export async function requireSession(): Promise<SessionAthlete> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}
