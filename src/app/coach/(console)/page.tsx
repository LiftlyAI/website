import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCoachSession } from '@/lib/coach-auth';
import { triageForCoach } from '@/lib/coach-data';
import { Card } from '@/components/ui/Card';
import type { DecisionSeverity } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SEVERITY_TEXT: Record<DecisionSeverity, string> = {
  caution: 'text-rpe-hard',
  suggest: 'text-rpe-mod',
  info: 'text-chalk-mute',
};

export default async function TriagePage() {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');
  const items = await triageForCoach(coach.id);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// FIRST PASS</div>
        <h1 className="stencil-heading text-3xl text-chalk mb-2">This week&apos;s triage</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="text-sm text-chalk-mute font-body max-w-2xl">
          The engine&apos;s first pass across your roster, ranked by who needs your eyes.
          Nothing here changes a client&apos;s program. Open a client to review and approve.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-chalk-dim font-body">
            No clients yet.{' '}
            <Link href="/coach/roster" className="text-blood hover:text-blood-glow">
              Add your roster
            </Link>{' '}
            to get a triage queue.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.athleteId}
              href={`/coach/clients/${item.athleteId}`}
              className="block"
            >
              <Card className="hover:border-blood/50 transition-colors border border-iron-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="stencil-heading text-lg text-chalk">
                        {item.name ?? item.email}
                      </span>
                      {item.pendingSuggestions > 0 && (
                        <span className="text-xs font-mono text-blood">
                          {item.pendingSuggestions} pending approval
                          {item.pendingSuggestions > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {item.flags.length === 0 ? (
                      <p className="text-xs text-chalk-mute font-body mt-1">
                        On track. Nothing flagged this week.
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-0.5">
                        {item.flags.map((f, i) => (
                          <li key={i} className={`text-xs font-body ${SEVERITY_TEXT[f.severity]}`}>
                            {f.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-2xl text-chalk">{item.score}</div>
                    <div className="text-[10px] uppercase tracking-wide text-chalk-mute font-body">
                      attention
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
