// Auth: Supabase Auth (email + password) for the session, Postgres for the
// athlete row. The Supabase user id IS the athletes.id, so once a user verifies
// their email we lazily provision their athlete row on first authenticated
// request. Login/signup happen client-side (see app/login/page.tsx); logout is
// app/api/auth/logout. There is no local file DB here — all access goes through
// the Postgres helpers in ./db (Vercel's filesystem is read-only).
import { headers } from 'next/headers';
import { createSupabaseServerClient } from './supabase/server';
import { execute, queryOne, uuid } from './db';

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
  // Web requests carry the session in cookies; native apps (Android/iOS) send the
  // Supabase access token as `Authorization: Bearer <jwt>`. Validate the bearer
  // token when present, otherwise fall back to the cookie-based session. This is
  // backward-compatible: existing web behavior is unchanged when no header is set.
  const authHeader = (await headers()).get('authorization');
  const bearer =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;
  const {
    data: { user },
  } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser();
  if (!user) return null;

  const row = await queryOne<{
    id: string;
    email: string;
    name: string | null;
    profile_json: string | null;
  }>('SELECT id, email, name, profile_json FROM athletes WHERE id = ?', [user.id]);

  if (!row) {
    const email = (user.email ?? '').toLowerCase().trim();
    // A coach may have pre-created this athlete by email (roster invite) before
    // their first Supabase sign-in — adopt that row, with its program and coach
    // link intact, instead of forking a second account keyed on the Supabase id.
    // (The email UNIQUE constraint would otherwise make the insert below a no-op
    // and strand them.)
    const byEmail = await queryOne<{
      id: string;
      email: string;
      name: string | null;
      profile_json: string | null;
    }>('SELECT id, email, name, profile_json FROM athletes WHERE email = ?', [email]);
    if (byEmail) {
      return {
        id: byEmail.id,
        email: byEmail.email,
        name: byEmail.name,
        hasProfile: !!byEmail.profile_json,
      };
    }
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

// Get-or-create by email, for flows where the athlete hasn't signed in yet
// (coach roster invites). When they later sign in via Supabase, getSession
// adopts this row by email match.
export async function getOrCreateAthleteByEmail(
  email: string,
  name?: string,
): Promise<SessionAthlete> {
  const normalized = email.trim().toLowerCase();
  const existing = await queryOne<{
    id: string;
    email: string;
    name: string | null;
    profile_json: string | null;
  }>('SELECT id, email, name, profile_json FROM athletes WHERE email = ?', [normalized]);
  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      hasProfile: !!existing.profile_json,
    };
  }
  const id = uuid();
  await execute('INSERT INTO athletes (id, email, name, created_at) VALUES (?, ?, ?, ?)', [
    id,
    normalized,
    name ?? null,
    Date.now(),
  ]);
  return { id, email: normalized, name: name ?? null, hasProfile: false };
}
