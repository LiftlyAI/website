import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import type { AthleteProfile } from '@/lib/types';
import { ProfileView } from './ProfileView';

export default async function ProfilePage() {
  const session = await requireSession();
  const db = getDb();
  const row = db
    .prepare('SELECT profile_json FROM athletes WHERE id = ?')
    .get(session.id) as { profile_json: string };
  const profile = JSON.parse(row.profile_json) as AthleteProfile;
  return <ProfileView profile={profile} email={session.email} />;
}
