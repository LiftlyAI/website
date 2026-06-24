import { requireSession } from '@/lib/auth';
import { getProgramData } from '@/lib/program';
import { ProgramView } from './ProgramView';

export default async function ProgramPage() {
  const session = await requireSession();
  const data = await getProgramData(session.id);

  if (!data) {
    return (
      <div className="stagger px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-5xl">
        <div className="page-kicker mb-2">// THE PLAN</div>
        <h1 className="stencil-heading text-4xl mb-4 text-chalk">Program</h1>
        <div className="chalk-card p-6 text-chalk-mute">
          No program yet. Try regenerating from your profile.
        </div>
      </div>
    );
  }

  return (
    <ProgramView
      profile={data.profile}
      program={data.program}
      currentWeek={data.currentWeek}
      programId={data.programId}
    />
  );
}
