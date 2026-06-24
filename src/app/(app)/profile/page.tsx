import { requireSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import type { AthleteProfile } from '@/lib/types';
import { safeJsonParse } from '@/lib/utils';
import { ProfileView } from './ProfileView';
import { AthleteBilling } from '@/components/billing/BillingPanel';

export default async function ProfilePage() {
  const session = await requireSession();
  const row = (await queryOne<{ profile_json: string }>(
    'SELECT profile_json FROM athletes WHERE id = ?',
    [session.id],
  ))!;
  const profile = safeJsonParse<AthleteProfile>(row.profile_json, {} as AthleteProfile);
  return (
    <>
      <ProfileView profile={profile} email={session.email} />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-2xl">
        <AthleteBilling />
      </div>
    </>
  );
}
