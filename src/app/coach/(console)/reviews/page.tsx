import { redirect } from 'next/navigation';
import { getCoachSession } from '@/lib/coach-auth';
import { listSharedFormChecksForCoach } from '@/lib/form-review-data';
import { FormReviewsClient } from './FormReviewsClient';

export const dynamic = 'force-dynamic';

export default async function CoachFormReviewsPage() {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');
  const items = await listSharedFormChecksForCoach(coach.id);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// FORM REVIEWS</div>
        <h1 className="stencil-heading mb-2 text-3xl text-chalk">Form reviews</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="max-w-2xl font-body text-sm text-chalk-mute">
          Clips your athletes shared. The AI bar-path read is already done — add your human cue, or
          start from an AI draft, and it goes straight back to the athlete.
        </p>
      </div>
      <FormReviewsClient items={items} />
    </div>
  );
}
