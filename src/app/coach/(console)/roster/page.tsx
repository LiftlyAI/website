import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCoachSession } from '@/lib/coach-auth';
import { listRoster } from '@/lib/coach-data';
import { Card, CardHeader } from '@/components/ui/Card';
import { AddClients } from './AddClients';

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const coach = await getCoachSession();
  if (!coach) redirect('/coach/login');
  const roster = await listRoster(coach.id);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// YOUR LIFTERS</div>
        <h1 className="stencil-heading text-3xl text-chalk mb-2">Roster</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="text-sm text-chalk-mute font-body max-w-2xl">
          {roster.length} client{roster.length === 1 ? '' : 's'}. New clients sign in with
          their email and onboard themselves — their program then routes through your
          approval queue.
        </p>
      </div>

      <AddClients />

      {roster.length > 0 && (
        <Card>
          <CardHeader title="Clients" accent />
          <div className="divide-y divide-iron-800">
            {roster.map((r) => (
              <Link
                key={r.athleteId}
                href={`/coach/clients/${r.athleteId}`}
                className="flex items-center justify-between gap-4 py-3 group"
              >
                <div className="min-w-0">
                  <div className="text-sm text-chalk font-body group-hover:text-blood-glow">
                    {r.name ?? r.email}
                  </div>
                  <div className="text-xs font-mono text-chalk-mute">{r.email}</div>
                </div>
                <div className="text-right shrink-0 text-xs font-mono text-chalk-mute">
                  {!r.hasProfile
                    ? 'not onboarded'
                    : r.daysSinceLastSession == null
                      ? 'no sessions'
                      : r.daysSinceLastSession === 0
                        ? 'trained today'
                        : `last session ${r.daysSinceLastSession}d ago`}
                  {r.pendingSuggestions > 0 && (
                    <span className="block text-blood">{r.pendingSuggestions} pending</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
