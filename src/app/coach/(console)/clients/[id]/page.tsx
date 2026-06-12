import { notFound, redirect } from 'next/navigation';
import { coachOwnsAthlete, getCoachSession } from '@/lib/coach-auth';
import { queryOne } from '@/lib/db';
import { listSuggestions } from '@/lib/coach-data';
import { computeWeeklyReview } from '@/lib/review-data';
import { Card, CardHeader } from '@/components/ui/Card';
import type { AthleteProfile, DecisionSeverity } from '@/lib/types';
import { SuggestionQueue } from './SuggestionQueue';

export const dynamic = 'force-dynamic';

const SEVERITY_TEXT: Record<DecisionSeverity, string> = {
  caution: 'text-rpe-hard',
  suggest: 'text-rpe-mod',
  info: 'text-chalk-mute',
};

export default async function ClientPage({ params }: { params: { id: string } }) {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');
  // Object-level authorization: a coach can only open their own clients.
  if (!(await coachOwnsAthlete(coach.id, params.id))) notFound();

  const aRow = await queryOne<{
    name: string | null;
    email: string;
    profile_json: string | null;
  }>('SELECT name, email, profile_json FROM athletes WHERE id = ?', [params.id]);
  if (!aRow) notFound();
  const profile = aRow.profile_json
    ? (JSON.parse(aRow.profile_json) as AthleteProfile)
    : null;

  const review = profile ? await computeWeeklyReview(params.id) : null;
  const suggestions = await listSuggestions(coach.id, params.id);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// CLIENT FILE</div>
        <h1 className="stencil-heading text-3xl text-chalk mb-1">
          {aRow.name ?? aRow.email}
        </h1>
        <div className="text-xs font-mono text-chalk-mute mb-2">{aRow.email}</div>
        <div className="accent-divider max-w-[80px]" />
      </div>

      {!profile ? (
        <Card>
          <p className="text-sm text-chalk-dim font-body">
            This client hasn&apos;t onboarded yet — once they sign in and finish intake,
            their maxes, program and triage signals show up here.
          </p>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Profile" subtitle={`${profile.experience} · ${profile.unit}`} accent />
          <div className="grid grid-cols-3 gap-4 text-center">
            {(['squat', 'bench', 'deadlift'] as const).map((lift) => (
              <div key={lift}>
                <div className="text-[10px] uppercase tracking-wide text-chalk-mute font-body">
                  {lift}
                </div>
                <div className="font-mono text-xl text-chalk">
                  {profile.currentMaxes[lift] ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {review && review.findings.length > 0 && (
        <Card>
          <CardHeader title="This week's signals" subtitle={review.blockName ?? undefined} accent />
          <ul className="space-y-3">
            {review.findings.map((f, i) => (
              <li key={i}>
                <div className={`text-sm font-body font-semibold ${SEVERITY_TEXT[f.severity]}`}>
                  {f.title}
                </div>
                <p className="text-xs text-chalk-dim font-body mt-0.5">{f.detail}</p>
                <p className="text-xs text-chalk-mute font-body mt-0.5">{f.action}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SuggestionQueue athleteId={params.id} suggestions={suggestions} />
    </div>
  );
}
