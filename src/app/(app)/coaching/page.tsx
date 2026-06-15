import Link from 'next/link';
import { ArrowRight, UserCheck } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { getAthleteCoaching, feedForAthlete } from '@/lib/network-data';
import { Card, CardHeader } from '@/components/ui/Card';
import { CoachCardItem } from '@/components/network/CoachCardItem';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-rpe-mod/15 text-rpe-mod',
  accepted: 'bg-rpe-easy/15 text-rpe-easy',
  rejected: 'bg-iron-800 text-chalk-mute',
  waitlisted: 'bg-blood/15 text-blood-glow',
};

export default async function CoachingPage() {
  const athlete = await requireSession();
  const [{ currentCoach, applications, saved, following }, feed] = await Promise.all([
    getAthleteCoaching(athlete.id),
    feedForAthlete(athlete.id, 20),
  ]);

  return (
    <div className="stagger space-y-6">
      <div>
        <div className="page-kicker mb-2">// HUMAN COACHING</div>
        <h1 className="stencil-heading mb-2 text-3xl text-chalk">Find a Coach</h1>
        <div className="accent-divider mb-3 max-w-[80px]" />
        <p className="max-w-2xl font-body text-sm text-chalk-mute">
          Ready for a human coach? Browse the Coaches Network and apply — your training, programming
          and progress stay right here in Liftly.
        </p>
      </div>

      <Link
        href="/coaches"
        className="card-interactive flex items-center justify-between gap-4 rounded-xl p-5"
      >
        <span className="font-body text-sm font-semibold text-chalk">
          Browse the Coaches Network
        </span>
        <ArrowRight className="h-4 w-4 text-blood" />
      </Link>

      {currentCoach && (
        <Card>
          <CardHeader title="Your coach" accent />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blood/15 text-blood-glow">
                <UserCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="font-body text-sm font-semibold text-chalk">{currentCoach.name}</div>
                <div className="font-mono text-xs text-chalk-mute">Active coaching relationship</div>
              </div>
            </div>
            {currentCoach.username && (
              <Link
                href={`/coach/${currentCoach.username}`}
                className="font-mono text-xs text-blood-glow hover:underline"
              >
                View profile
              </Link>
            )}
          </div>
        </Card>
      )}

      {applications.length > 0 && (
        <Card>
          <CardHeader title="Your applications" accent />
          <div className="divide-y divide-iron-800">
            {applications.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  {a.coachUsername ? (
                    <Link
                      href={`/coach/${a.coachUsername}`}
                      className="font-body text-sm text-chalk hover:text-blood-glow"
                    >
                      {a.coachName}
                    </Link>
                  ) : (
                    <span className="font-body text-sm text-chalk">{a.coachName}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'rounded px-2 py-0.5 font-mono text-[10px] uppercase',
                    STATUS_STYLE[a.status],
                  )}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {feed.length > 0 && (
        <div className="space-y-3">
          <h2 className="stencil-heading text-lg text-chalk">From coaches you follow</h2>
          <div className="space-y-3">
            {feed.map((p) => (
              <Card key={p.id}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="font-body text-sm font-semibold text-chalk">{p.title}</span>
                  {p.coachUsername ? (
                    <Link
                      href={`/coach/${p.coachUsername}`}
                      className="font-mono text-xs text-blood-glow hover:underline"
                    >
                      {p.coachName}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs text-chalk-mute">{p.coachName}</span>
                  )}
                </div>
                <p className="line-clamp-3 whitespace-pre-line font-body text-sm text-chalk-dim">
                  {p.body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {following.length > 0 && (
        <div className="space-y-3">
          <h2 className="stencil-heading text-lg text-chalk">Following</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {following.map((c) => (
              <CoachCardItem key={c.id} coach={c} />
            ))}
          </div>
        </div>
      )}

      {saved.length > 0 && (
        <div className="space-y-3">
          <h2 className="stencil-heading text-lg text-chalk">Saved coaches</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((c) => (
              <CoachCardItem key={c.id} coach={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
