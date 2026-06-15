import { redirect } from 'next/navigation';
import { getCoachSession } from '@/lib/coach-auth';
import {
  getCoachEditState,
  listCredentials,
  listServices,
  listShowcase,
} from '@/lib/network-data';
import { ProfileEditor } from './ProfileEditor';
import { CredentialsManager } from './CredentialsManager';
import { ServicesEditor } from './ServicesEditor';
import { ShowcaseEditor } from './ShowcaseEditor';

export const dynamic = 'force-dynamic';

export default async function CoachProfilePage() {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');
  const [state, credentials, services, showcase] = await Promise.all([
    getCoachEditState(coach.id),
    listCredentials(coach.id),
    listServices(coach.id),
    listShowcase(coach.id),
  ]);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// YOUR LISTING</div>
        <h1 className="stencil-heading mb-2 text-3xl text-chalk">Public profile</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="max-w-2xl font-body text-sm text-chalk-mute">
          This is how athletes find and evaluate you in the Coaches Network. Fill it out, list
          publicly, and your profile goes live at <span className="font-mono text-chalk-dim">/coach/{state.username ?? 'your-username'}</span>.
        </p>
      </div>

      <ProfileEditor
        initialUsername={state.username}
        initialProfile={state.profile}
        initialListed={state.listed}
      />
      <CredentialsManager initial={credentials} />
      <ServicesEditor initial={services} />
      <ShowcaseEditor initial={showcase} />
    </div>
  );
}
