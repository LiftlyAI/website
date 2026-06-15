// Admin gate. There is no separate admin account system: an admin is simply a
// coach whose email is on the ADMIN_EMAILS allowlist (comma-separated env var).
// They log in through the normal coach login; requireAdmin then checks the
// allowlist. If ADMIN_EMAILS is unset, NO ONE is an admin (secure default).
import { getCoachSession, type SessionCoach } from './coach-auth';

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export async function getAdmin(): Promise<SessionCoach | null> {
  const coach = await getCoachSession();
  if (!coach || !isAdminEmail(coach.email)) return null;
  return coach;
}

export async function requireAdmin(): Promise<SessionCoach> {
  const admin = await getAdmin();
  if (!admin) throw new Error('FORBIDDEN');
  return admin;
}
