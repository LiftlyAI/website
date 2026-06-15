import { redirect } from 'next/navigation';
import { getCoachSession } from '@/lib/coach-auth';
import { listApplicationsForCoach } from '@/lib/network-data';
import { ApplicationsInbox } from './ApplicationsInbox';

export const dynamic = 'force-dynamic';

export default async function CoachApplicationsPage() {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');
  const applications = await listApplicationsForCoach(coach.id);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// INCOMING ATHLETES</div>
        <h1 className="stencil-heading mb-2 text-3xl text-chalk">Applications</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="max-w-2xl font-body text-sm text-chalk-mute">
          Athletes who applied through your public profile. Accept to add them straight to your
          roster — their program then routes through your approval queue.
        </p>
      </div>

      <ApplicationsInbox applications={applications} />
    </div>
  );
}
