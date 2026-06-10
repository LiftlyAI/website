import { requireSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import type { AthleteProfile } from '@/lib/types';
import { ProfileView } from './ProfileView';

export default async function ProfilePage() {
  const session = await requireSession();
  const row = (await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  ))!;
  const profile = JSON.parse(row.profile_json) as AthleteProfile;
  return <ProfileView profile={profile} email={session.email} />;
}
