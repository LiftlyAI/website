import { redirect } from 'next/navigation';
import { getCoachSession } from '@/lib/coach-auth';
import { listRoster } from '@/lib/coach-data';
import { BulkClient } from './BulkClient';

export const dynamic = 'force-dynamic';

export default async function BulkPage() {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');
  const roster = await listRoster(coach.id);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// ONE WEEK, MANY LIFTERS</div>
        <h1 className="stencil-heading text-3xl text-chalk mb-2">Bulk block</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="text-sm text-chalk-mute font-body max-w-2xl">
          Push one template week to many clients at once. Loads are personalized per
          client off their own e1RM — %1RM when you give one, otherwise the reps×RPE
          chart. Appends as the next week of each client&apos;s program.
        </p>
      </div>
      <BulkClient roster={roster} />
    </div>
  );
}
